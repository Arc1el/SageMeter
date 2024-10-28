'use client';

import React, { useEffect, useState } from 'react';
import { SageMakerRuntimeClient, InvokeEndpointCommand } from "@aws-sdk/client-sagemaker-runtime";
import { STSClient, GetCallerIdentityCommand, GetSessionTokenCommand } from "@aws-sdk/client-sts";
import JsonValidator from '@/app/components/JsonValidator';
import ResponseCodeGraph from '@/app/components/ResponseCodeGraph';
import RequestResponseChart from '../components/RequestResponseChart';
import LatencyChart from '../components/LatencyChart';

type EndpointConfig = {
  endpointName: string;
  region: string;
  modelVersion: string;
  contentType: string;
  payloadFormat: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
};

type TestConfig = {
  requestsPerSecond: number;
};

const TestExecutionPage = () => {
  const [endpointConfig, setEndpointConfig] = useState<EndpointConfig | null>(null);
  const [testConfig, setTestConfig] = useState<TestConfig>(() => ({
    requestsPerSecond: 10,
  }));
  const [testStatus, setTestStatus] = useState<string>('idle');
  const [testResults, setTestResults] = useState<string | null>(null);
  const [isSingleTest, setIsSingleTest] = useState<boolean>(false);
  const [singleTestPayload, setSingleTestPayload] = useState<string>('');
  const [payloadConfirmed, setPayloadConfirmed] = useState(false);
  const [responseCodes, setResponseCodes] = useState<{ [key: number]: number }>({});
  const [isTestRunning, setIsTestRunning] = useState<boolean>(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [requestTimes, setRequestTimes] = useState<number[]>([]);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [responseCount, setResponseCount] = useState(0);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const [currentRequestNumber, setCurrentRequestNumber] = useState(0);
  const [testDuration, setTestDuration] = useState(60); // 테스트 지속 시간 (초)

  useEffect(() => {
    const loadEndpointConfig = () => {
      const savedConfig = localStorage.getItem('endpointConfig');
      if (savedConfig) {
        setEndpointConfig(JSON.parse(savedConfig));
      } else {
        setEndpointConfig(null);
      }
    };
    loadEndpointConfig();
    window.addEventListener('focus', loadEndpointConfig);
    return () => {
      window.removeEventListener('focus', loadEndpointConfig);
    };
  }, []);

  const handleTestConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTestConfig(prev => ({ ...prev, [name]: parseInt(value, 10) }));
  };

  const runTest = async () => {
    if (isTestRunning) {
      // 테스트 중지
      abortController?.abort();
      setIsTestRunning(false);
      setTestStatus('stopped');
      setIsRequestInProgress(false);
      return;
    }

    // 테스트 시작
    setIsTestRunning(true);
    setTestStatus('running');
    setTestResults(null);
    setResponseCodes({});
    setIsRequestInProgress(true);
    setCurrentRequestNumber(0);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch('/api/run-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testConfig: {
            ...testConfig,
            duration: testDuration, // 테스트 지속 시간 추가
          },
          endpointConfig,
          singleTestPayload,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('테스트 시작 실패');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader?.read() || { done: true, value: undefined };
        if (done) break;
        
        const events = decoder.decode(value).split('\n\n');
        for (const event of events) {
          if (event.trim() === '') continue;
          const data = JSON.parse(event.replace('data: ', ''));
          
          if (data.responseCodes) {
            setResponseCodes(data.responseCodes);
          }
          if (data.requestCount !== undefined) {
            setRequestCount(data.requestCount);
          }
          if (data.responseCount !== undefined) {
            setResponseCount(data.responseCount);
          }
          if (data.latencies) {
            setLatencies(data.latencies);
          }
          if (data.status === 'running') {
            setTestResults(JSON.stringify(data, null, 2));
            setIsRequestInProgress(true);
          }
          if (data.status === 'error') {
            setTestStatus('error');
            setTestResults(JSON.stringify(data, null, 2));
            setIsTestRunning(false);
            setIsRequestInProgress(false);
            break;
          }
          if (data.currentRequestNumber !== undefined) {
            setCurrentRequestNumber(data.currentRequestNumber);
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('테스트가 중지되었습니다.');
        setTestStatus('stopped');
      } else {
        console.error('테스트 실행 중 오류 발생:', error);
        setTestStatus('error');
        setTestResults('테스트 실행 중 오류가 발생했습니다.');
      }
      setIsTestRunning(false);
      setIsRequestInProgress(false);
    }
  };

  const runSingleTest = async () => {
    setTestStatus('running');
    setTestResults(null);
    setResponseCodes({}); // 응답 코드 초기화

    const tempCredentials = await validateCredentials();
    if (!tempCredentials) {
      setTestStatus('error');
      setTestResults('AWS 자격 증명이 유효하지 않습니다. 엔드포인트 설정을 확인해주세요.');
      return;
    }

    const client = new SageMakerRuntimeClient({
      region: endpointConfig?.region,
      credentials: {
        accessKeyId: tempCredentials.AccessKeyId || '',
        secretAccessKey: tempCredentials.SecretAccessKey || '',
        sessionToken: tempCredentials.SessionToken,
      },
    });

    try {
      const command = new InvokeEndpointCommand({
        EndpointName: endpointConfig?.endpointName,
        ContentType: endpointConfig?.contentType,
        Body: singleTestPayload,
      });

      const response = await client.send(command);
      
      // 응답 데이터 처리
      let responseBody;
      if (response.Body instanceof Uint8Array) {
        responseBody = new TextDecoder().decode(response.Body);
      } else if (typeof response.Body === 'string') {
        responseBody = response.Body;
      } else {
        responseBody = JSON.stringify(response.Body);
      }

      const statusCode = response.$metadata.httpStatusCode || 0;
      setResponseCodes(prevCodes => ({
        ...prevCodes,
        [statusCode]: (prevCodes[statusCode] || 0) + 1
      }));

      setTestStatus('completed');
      setTestResults(JSON.stringify({
        statusCode: statusCode,
        body: responseBody,
      }, null, 2));
    } catch (error) {
      console.error('단일 테스트 실행 중 오류 발생:', error);
      setTestStatus('error');
      setTestResults('단일 테스트 실행 중 오류가 발생했습니다.');
      setResponseCodes(prevCodes => ({
        ...prevCodes,
        500: (prevCodes[500] || 0) + 1
      }));
    }
  };

  const validateCredentials = async () => {
    if (!endpointConfig?.awsAccessKeyId || !endpointConfig?.awsSecretAccessKey) {
      console.error('AWS 자격 증명이 없습니다.');
      return null;
    }

    try {
      const sts = new STSClient({
        region: endpointConfig.region,
        credentials: {
          accessKeyId: endpointConfig.awsAccessKeyId,
          secretAccessKey: endpointConfig.awsSecretAccessKey,
        },
      });
      const command = new GetSessionTokenCommand({});
      const response = await sts.send(command);
      return response.Credentials;
    } catch (error) {
      console.error('임시 자격 증명 생성 실패:', error);
      return null;
    }
  };

  if (!endpointConfig) {
    return <div className="p-4">설정된 엔드포인트 정보가 없습니다. 엔드포인트 설정 페이지에서 설정을 완료해주세요.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">테스트 실행</h1>
      
      <div className="grid grid-cols-3 gap-4">
        {/* 1. Payload */}
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">Payload</h2>
          <JsonValidator onValidJson={(json) => {
            setSingleTestPayload(json);
            setPayloadConfirmed(false);
          }} />
          <button
            onClick={() => setPayloadConfirmed(true)}
            className="mt-4 bg-apple-blue text-white p-2 rounded hover:bg-opacity-90 transition-colors duration-200"
          >
            페이로드 확인
          </button>
          {payloadConfirmed && (
            <p className="mt-2 text-green-500">페이로드가 확인되었습니다.</p>
          )}
        </div>

        {/* 2. 테스트 설정 */}
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">테스트 설정</h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="requestsPerSecond">
              초당 요청 수
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="requestsPerSecond"
              type="number"
              name="requestsPerSecond"
              value={testConfig.requestsPerSecond}
              onChange={handleTestConfigChange}
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isSingleTest}
                onChange={(e) => setIsSingleTest(e.target.checked)}
                className="mr-2"
              />
              단일 테스트 실행
            </label>
          </div>
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={isSingleTest ? runSingleTest : runTest}
          >
            {isSingleTest ? '단일 테스트 실행' : (isTestRunning ? '부하 테스트 중지' : '부하 테스트 시작')}
          </button>
        </div>

        {/* 3. 테스트 결과 */}
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">테스트 결과</h2>
          {testStatus === 'running' && <p>테스트 진행 중...</p>}
          {(testStatus === 'running' || testStatus === 'completed' || testStatus === 'stopped') && (
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
              {testResults}
            </pre>
          )}
          {testStatus === 'error' && <p className="text-red-500">{testResults}</p>}
        </div>

        {/* 4. 테스트 시각화 (전체 너비) */}
        <div className="col-span-3 bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="text-xl font-semibold mb-4">테스트 시각화</h2>
          {(testStatus === 'running' || testStatus === 'completed' || testStatus === 'stopped') && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">요청 및 응답 수</h3>
                <RequestResponseChart requestCount={requestCount} responseCount={responseCount} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">응답 코드 분포</h3>
                <ResponseCodeGraph responseCodes={responseCodes} key={JSON.stringify(responseCodes)} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">응답 지연 시간 분포</h3>
                <LatencyChart latencies={latencies} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestExecutionPage;
