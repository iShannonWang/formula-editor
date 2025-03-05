// App.jsx 使用简化版公式编辑器
import React, { useRef, useState } from 'react';
import { Button, Space, message, Typography } from 'antd';
import FormulaEditor from './components/FormulaEditor';
import './App.css';

// 导入常量
import { FIELDS, FIELD_TYPES, FIELD_TYPE_CONFIGS, FUNCTION_GROUPS, FUNCTIONS } from './constants';

const { Title, Text } = Typography;

function App() {
  const formulaEditorRef = useRef(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [result, setResult] = useState(null);

  // 获取公式并打印到控制台
  const printFormula = () => {
    if (formulaEditorRef.current) {
      const originalFormula = formulaEditorRef.current.getFormula();
      const translatedFormula = formulaEditorRef.current.getTranslatedFormula();

      console.log('原始公式:', originalFormula);
      console.log('翻译后的公式:', translatedFormula);

      messageApi.success('公式已打印到控制台');
    }
  };

  // 验证并显示公式
  const validateAndShow = () => {
    if (formulaEditorRef.current) {
      const validationResult = formulaEditorRef.current.validateAndTranslate();
      setResult(validationResult);

      if (validationResult.isValid) {
        messageApi.success('公式格式正确');
      } else {
        messageApi.error(`公式格式错误: ${validationResult.error}`);
      }
    }
  };

  return (
    <div className="app">
      {/* {contextHolder} */}

      {/* <header style={{ marginBottom: '20px' }}>
        <Title level={2}>公式编辑器示例</Title>
      </header> */}

      {/* <Space style={{ marginBottom: '16px' }}>
        <Button
          type="primary"
          onClick={printFormula}
        >
          获取并打印公式
        </Button>
        <Button onClick={validateAndShow}>验证并显示公式</Button>
      </Space>

      {result && (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            border: '1px solid #f0f0f0',
            borderRadius: '8px',
            backgroundColor: result.isValid ? '#f6ffed' : '#fff2f0',
          }}
        >
          <Title level={4}>验证结果</Title>

          {result.isValid ? (
            <>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>原始公式:</Text>
                <pre style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  {result.originalFormula}
                </pre>
              </div>
              <div>
                <Text strong>翻译后公式:</Text>
                <pre style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  {result.translatedFormula}
                </pre>
              </div>
              {result.variables && result.variables.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <Text strong>使用的变量:</Text>
                  <ul>
                    {result.variables.map((v, index) => (
                      <li key={index}>
                        {v.name} ({v.type}) → {v.mapping}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <Text type="danger">{result.error}</Text>
          )}
        </div>
      )} */}

      <FormulaEditor
        ref={formulaEditorRef}
        height="80vh"
        fields={FIELDS}
        fieldTypes={FIELD_TYPES}
        fieldTypeConfigs={FIELD_TYPE_CONFIGS}
        functionGroups={FUNCTION_GROUPS}
        functionDefinitions={FUNCTIONS}
        onChange={(newFormula) => {
          console.log('公式已更新:', newFormula);
        }}
      />
    </div>
  );
}

export default App;
