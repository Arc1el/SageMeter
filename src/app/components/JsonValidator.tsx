'use client';

import React, { useState } from 'react';

const JsonValidator: React.FC<{ onValidJson: (json: string) => void }> = ({ onValidJson }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateJson = () => {
    try {
      const parsedJson = JSON.parse(jsonInput);
      setIsValid(true);
      setErrorMessage(null);
      onValidJson(JSON.stringify(parsedJson, null, 2));
    } catch (e) {
      setIsValid(false);
      setErrorMessage((e as Error).message);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-2">JSON 데이터 검증</h2>
      <textarea
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        className="w-full p-2 border rounded"
        rows={5}
        placeholder="여기에 JSON을 입력하세요"
      />
      <button 
        onClick={validateJson} 
        className="mt-2 bg-apple-blue text-white p-2 rounded hover:bg-opacity-90 transition-colors duration-200"
      >
        검증
      </button>
      {isValid !== null && (
        <p className={`mt-2 ${isValid ? 'text-green-500' : 'text-red-500'}`}>
          {isValid ? 'JSON이 유효합니다.' : `JSON이 유효하지 않습니다: ${errorMessage}`}
        </p>
      )}
    </div>
  );
};

export default JsonValidator;
