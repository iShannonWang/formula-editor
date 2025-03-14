// App.jsx 使用简化版公式编辑器
import React, { useRef, useState } from 'react';
import { Button, Space, message, Typography, Card, Input, Form, Divider } from 'antd';
import FormulaEditor from './components/FormulaEditor';
import { calculateFormula } from './calculateFormula';

// 导入常量
import { FIELDS, FIELD_TYPES, FIELD_TYPE_CONFIGS, FUNCTION_GROUPS, FUNCTIONS } from './constants';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

function App() {
  const formulaEditorRef = useRef(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [result, setResult] = useState(null);
  const [variablesJson, setVariablesJson] = useState('{\n  "age": 4,\n  "count": 3\n}');
  const [calculationResult, setCalculationResult] = useState(null);
  const [error, setError] = useState(null);

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

  // 解析并应用公式
  const evaluateFormula = () => {
    try {
      if (!formulaEditorRef.current) {
        setError('公式编辑器未初始化');
        return;
      }

      // 获取原始中文公式和翻译后的英文公式
      const formula = formulaEditorRef.current.getFormula();
      const translatedFormula = formulaEditorRef.current.getTranslatedFormula();

      if (!formula.trim()) {
        setError('请先输入公式');
        return;
      }

      let variables = {};
      try {
        variables = JSON.parse(variablesJson);
      } catch (err) {
        setError(`变量JSON格式错误: ${err.message}`);
        return;
      }

      // 使用翻译后的英文公式进行计算，而不是原始中文公式
      const calculatedResult = calculateFormula(translatedFormula, variables);

      // 检查是否返回了错误信息
      if (typeof calculatedResult === 'string' && calculatedResult.startsWith('错误:')) {
        setError(calculatedResult);
        setCalculationResult(null);
      } else {
        setCalculationResult(calculatedResult);
        setError(null);
      }
    } catch (err) {
      setError(`计算错误: ${err.message}`);
      setCalculationResult(null);
    }
  };

  return (
    <div className="app">
      {contextHolder}

      <FormulaEditor
        // ref={formulaEditorRef}
        height="45vh"
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
