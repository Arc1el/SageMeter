'use client';

import React, { useState, useEffect } from 'react';
import JsonValidator from '@/app/components/JsonValidator';
import { SageMakerClient, ListEndpointsCommand, DescribeEndpointCommand } from "@aws-sdk/client-sagemaker";

type EndpointConfig = {
  endpointName: string;
  region: string;
  modelVersion: string;
  contentType: string;
  payloadFormat: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
};

const defaultConfig: EndpointConfig = {
  endpointName: '',
  region: 'us-east-1',
  modelVersion: '1.0',
  contentType: 'application/json',
  payloadFormat: 'JSON',
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
};

type Endpoint = {
  name: string;
  modelName: string;
  status: string;
};

const EndpointConfigPage = () => {
  const [config, setConfig] = useState<EndpointConfig>(defaultConfig);
  const [endpoints, setEndpoints] = useState<Array<{name: string, modelName: string, status: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configConfirmed, setConfigConfirmed] = useState(false);
  const [jsonPayload, setJsonPayload] = useState<string>('');
  const [payloadConfirmed, setPayloadConfirmed] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem('endpointConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  useEffect(() => {
    const savedEndpoints = localStorage.getItem('endpoints');
    if (savedEndpoints) {
      setEndpoints(JSON.parse(savedEndpoints));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prevConfig => ({
      ...prevConfig,
      [name]: value
    }));
    setConfigConfirmed(false); // 설정이 변경되면 확인 상태 초기화
  };

  const handleConfirmConfig = () => {
    localStorage.setItem('endpointConfig', JSON.stringify(config));
    setConfigConfirmed(true);
  };

  const handleConfirmPayload = () => {
    setPayloadConfirmed(true);
  };

  const fetchEndpoints = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('엔드포인트 가져오기 시작');
      const client = new SageMakerClient({
        region: config.region,
        credentials: {
          accessKeyId: config.awsAccessKeyId,
          secretAccessKey: config.awsSecretAccessKey,
        },
      });

      console.log('SageMaker 클라이언트 생성됨');
      const command = new ListEndpointsCommand({});
      console.log('ListEndpointsCommand 생성됨');
      const response = await client.send(command);
      console.log('응답 받음:', response);

      if (response.Endpoints) {
        const endpointDetails = await Promise.all(response.Endpoints.map(async (endpoint) => {
          const describeEndpointCommand = new DescribeEndpointCommand({ EndpointName: endpoint.EndpointName });
          const endpointDetails = await client.send(describeEndpointCommand);
          return {
            name: endpoint.EndpointName || '',
            modelName: endpointDetails.EndpointConfigName || '',
            status: endpoint.EndpointStatus || '',
          };
        }));

        console.log('가져온 엔드포인트:', endpointDetails);
        setEndpoints(endpointDetails);
        localStorage.setItem('endpoints', JSON.stringify(endpointDetails));
        if (endpointDetails.length > 0) {
          setConfig(prevConfig => ({
            ...prevConfig,
            endpointName: endpointDetails[0].name,
            modelVersion: endpointDetails[0].modelName || '',
          }));
        }
      } else {
        console.log('엔드포인트가 없거나 응답이 비어있습니다.');
      }
    } catch (err) {
      console.error('엔드포인트 목록 가져오기 오류:', err);
      setError('엔드포인트 목록을 가져오는 데 실패했습니다. AWS 자격 증명을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">엔드포인트 및 요청 설정</h1>
      <form className="space-y-4">
        <div>
          <label htmlFor="awsAccessKeyId" className="block mb-1">AWS Access Key ID</label>
          <input
            type="password"
            id="awsAccessKeyId"
            name="awsAccessKeyId"
            value={config.awsAccessKeyId}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label htmlFor="awsSecretAccessKey" className="block mb-1">AWS Secret Access Key</label>
          <input
            type="password"
            id="awsSecretAccessKey"
            name="awsSecretAccessKey"
            value={config.awsSecretAccessKey}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label htmlFor="region" className="block mb-1">리전</label>
          <select
            id="region"
            name="region"
            value={config.region}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="us-east-1">US East (N. Virginia)</option>
            <option value="us-west-2">US West (Oregon)</option>
            <option value="eu-west-1">EU (Ireland)</option>
            <option value="ap-northeast-2">Asia Pacific (Seoul)</option>
            {/* 필요한 리전을 추가하세요 */}
          </select>
        </div>
        <button
          type="button"
          onClick={fetchEndpoints}
          className="bg-apple-blue text-white p-2 rounded hover:bg-opacity-90 transition-colors duration-200 mt-4"
          disabled={loading}
        >
          {loading ? '로딩 중...' : '엔드포인트 가져오기'}
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
        <div>
          <label htmlFor="endpointName" className="block mb-1">엔드포인트 이름</label>
          <select
            id="endpointName"
            name="endpointName"
            value={config.endpointName}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            {endpoints.map(endpoint => (
              <option key={endpoint.name} value={endpoint.name}>
                {endpoint.name} ({endpoint.status}) - Model: {endpoint.modelName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="modelVersion" className="block mb-1">모델 버전</label>
          <input
            type="text"
            id="modelVersion"
            name="modelVersion"
            value={config.modelVersion}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label htmlFor="contentType" className="block mb-1">Content-Type</label>
          <select
            id="contentType"
            name="contentType"
            value={config.contentType}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="application/json">JSON</option>
            <option value="text/csv">CSV</option>
            <option value="application/x-npy">NPY</option>
          </select>
        </div>
        <div>
          <label htmlFor="payloadFormat" className="block mb-1">Payload 포맷</label>
          <select
            id="payloadFormat"
            name="payloadFormat"
            value={config.payloadFormat}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="JSON">JSON</option>
            <option value="CSV">CSV</option>
            <option value="NPY">NPY</option>
          </select>
        </div>
      </form>
      <JsonValidator onValidJson={(json) => {
        setJsonPayload(json);
        setPayloadConfirmed(false);
      }} />
      <br></br>
      <button
        type="button"
        onClick={handleConfirmConfig}
        className="bg-apple-blue text-white p-2 rounded hover:bg-opacity-90 transition-colors duration-200"
      >
        설정 확인
      </button>

      {configConfirmed && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
          <p className="text-green-700">
            엔드포인트 설정이 확인되었습니다:
          </p>
          <ul className="list-disc pl-5 mt-2">
            <li>엔드포인트 이름: {config.endpointName}</li>
            <li>리전: {config.region}</li>
            <li>모델 버전: {config.modelVersion}</li>
            <li>Content-Type: {config.contentType}</li>
            <li>Payload 포맷: {config.payloadFormat}</li>
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirmPayload}
        className="mt-4 bg-apple-blue text-white p-2 rounded hover:bg-opacity-90 transition-colors duration-200"
      >
        페이로드 확인
      </button>

      {payloadConfirmed && jsonPayload && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
          <p className="text-green-700">
            JSON 페이로드가 확인되었습니다:
          </p>
          <pre className="mt-2 p-2 bg-white border border-green-200 rounded overflow-x-auto">
            {jsonPayload}
          </pre>
        </div>
      )}
    </div>
  );
};

export default EndpointConfigPage;
