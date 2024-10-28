import { NextApiRequest, NextApiResponse } from 'next';
import { SageMakerRuntimeClient, InvokeEndpointCommand } from "@aws-sdk/client-sagemaker-runtime";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  const { testConfig, endpointConfig, singleTestPayload } = req.body;

  let completedRequests = 0;
  const responseCodes: { [key: number]: number } = {};
  const errors: string[] = [];
  const requestTimes: number[] = [];
  const responseTimes: number[] = [];
  let requestCount = 0;
  let responseCount = 0;
  const latencies: number[] = [];

  let currentRequestNumber = 0;
  let intervalId: NodeJS.Timeout;

  const updateProgress = () => {
    res.write(`data: ${JSON.stringify({ progress: completedRequests })}\n\n`);
  };

  const updateResponseCodes = (statusCode: number) => {
    responseCodes[statusCode] = (responseCodes[statusCode] || 0) + 1;
    res.write(`data: ${JSON.stringify({ responseCodes })}\n\n`);
  };

  const client = new SageMakerRuntimeClient({
    region: endpointConfig.region,
    credentials: {
      accessKeyId: endpointConfig.awsAccessKeyId,
      secretAccessKey: endpointConfig.awsSecretAccessKey,
    },
  });

  const makeRequest = async () => {
    currentRequestNumber++;
    const startTime = Date.now();
    requestCount++;
    try {
      const command = new InvokeEndpointCommand({
        EndpointName: endpointConfig.endpointName,
        ContentType: endpointConfig.contentType,
        Body: singleTestPayload,
      });

      const response = await client.send(command);
      const endTime = Date.now();
      const statusCode = response.$metadata.httpStatusCode || 0;
      updateResponseCodes(statusCode);
      requestTimes.push(endTime - startTime);
      responseTimes.push(response.$metadata.totalRetryDelay || 0);
      const latency = endTime - startTime;
      latencies.push(latency);
      responseCount++;
    } catch (error) {
      console.error('요청 중 오류 발생:', error);
      updateResponseCodes(500);
      errors.push((error as Error).message);
    } finally {
      completedRequests++;
      updateProgress();
    }
  };

  const runTest = async () => {
    const startTime = Date.now();
    let isTestRunning = true;

    intervalId = setInterval(() => {
      if (!isTestRunning) return;

      for (let i = 0; i < testConfig.requestsPerSecond; i++) {
        currentRequestNumber++;
        makeRequest().then(() => {
          const elapsedTime = Date.now() - startTime;

          res.write(`data: ${JSON.stringify({ 
            status: 'running', 
            results: responseCodes, 
            errors: errors.length > 0 ? errors : undefined,
            completedRequests,
            elapsedTime,
            requestCount,
            responseCount,
            latencies,
            currentRequestNumber
          })}\n\n`);

          if (res.writableEnded) {
            console.log('클라이언트 연결이 끊어졌습니다. 새로운 요청은 중지하지만 응답은 계속 처리합니다.');
            isTestRunning = false;
          }
        });
      }
    }, 1000);

    // 테스트 종료 조건
    setTimeout(() => {
      isTestRunning = false;
      clearInterval(intervalId);

      // 모든 응답이 처리될 때까지 대기
      const checkResponses = setInterval(() => {
        if (responseCount >= requestCount) {
          clearInterval(checkResponses);
          res.write(`data: ${JSON.stringify({ 
            status: 'completed', 
            results: responseCodes, 
            errors: errors.length > 0 ? errors : undefined,
            completedRequests,
            requestTimes,
            responseTimes,
            requestCount,
            responseCount
          })}\n\n`);
          res.end();
        }
      }, 100);
    }, testConfig.duration * 1000);
  };

  runTest().catch((error) => {
    console.error('테스트 실행 중 오류 발생:', error);
    clearInterval(intervalId);
    res.write(`data: ${JSON.stringify({ 
      status: 'error', 
      message: '테스트 실행 중 오류가 발생했습니다.',
      error: (error as Error).message
    })}\n\n`);
    res.end();
  });
}
