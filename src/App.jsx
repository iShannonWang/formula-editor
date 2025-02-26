// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import FormulaEditor from './FormulaEditor';
import {
  calculate,
  formulaWatcher,
  validateFormula,
  extractVariables,
} from './react-formula-editor';
import './index.css';

function App() {
  const [form] = Form.useForm();
  const [formulaText, setFormulaText] = useState('');
  const [formulaValid, setFormulaValid] = useState(false);
  const [variables, setVariables] = useState([]);
  const [result, setResult] = useState('');
  const [formData, setFormData] = useState({});
  const formulaEditorRef = useRef(null);

  // 表单字段映射（中文名到英文字段名）
  const fieldMap = {
    名称: 'name',
    描述: 'desc',
    数量1: 'count1',
    数量2: 'count2',
    数量3: 'count3',
    单价: 'price',
    折扣: 'discount',
    税率: 'taxRate',
    日期: 'date',
  };

  // 字段列表（用于公式编辑器）
  const fieldList = Object.entries(fieldMap).map(([cnName, enCode]) => ({
    fullName: cnName,
    value: ['count1', 'count2', 'count3', 'price', 'discount', 'taxRate'].includes(enCode)
      ? 'number'
      : 'string',
    enCode: enCode,
    cnName: cnName,
  }));

  // 处理公式变化
  useEffect(() => {
    if (!formulaText) {
      setFormulaValid(false);
      setVariables([]);
      return;
    }

    // 验证公式
    const validationResult = validateFormula(formulaText);
    setFormulaValid(validationResult.valid);

    if (validationResult.valid) {
      // 提取公式中的变量
      const vars = extractVariables(formulaText, Object.values(fieldMap));
      setVariables(vars);

      // 重置表单
      const initialValues = {};
      vars.forEach((v) => {
        initialValues[v] = '';
      });
      form.setFieldsValue(initialValues);
      setFormData(initialValues);
    }
  }, [formulaText, form]);

  // 计算结果
  useEffect(() => {
    if (!formulaValid || !formulaText || Object.keys(formData).length === 0) {
      setResult('');
      return;
    }

    try {
      const calcResult = calculate({
        text: formulaText,
        variables: formData,
      });
      setResult(calcResult);
    } catch (error) {
      setResult('计算错误: ' + error.message);
    }
  }, [formulaText, formulaValid, formData]);

  // 获取公式编辑器的数据
  const handleGetFormula = () => {
    if (formulaEditorRef.current) {
      const data = formulaEditorRef.current.getData();
      if (data.isValid) {
        setFormulaText(data.formula);
        message.success('公式已更新');
      } else {
        message.error('公式无效: ' + data.error);
      }
    }
  };

  // 处理表单值变化
  const handleValuesChange = (changedValues, allValues) => {
    setFormData(allValues);
  };

  // 重置表单和公式
  const handleReset = () => {
    form.resetFields();
    setFormData({});
    if (formulaEditorRef.current) {
      formulaEditorRef.current.reset();
    }
    setFormulaText('');
    setResult('');
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>公式编辑计算器</h1>
      </div>

      <div className="app-content">
        {/* 上方：配置公式区域 */}
        <Card
          title="配置公式"
          className="config-card"
          bordered={false}
        >
          <FormulaEditor
            ref={formulaEditorRef}
            fieldList={fieldList}
            initialFormula={formulaText}
          />
          <div className="button-bar">
            <Button onClick={handleReset}>重置</Button>
            <Button
              type="primary"
              onClick={handleGetFormula}
            >
              应用公式
            </Button>
          </div>
        </Card>

        {/* 下方：应用公式区域 */}
        <Card
          title="应用公式"
          className="result-card"
          bordered={false}
        >
          <div className="formula-display">
            <h3>当前公式：</h3>
            <div className="formula-text">{formulaText || '无'}</div>
            <div className={`formula-status ${formulaValid ? 'valid' : 'invalid'}`}>
              {formulaValid ? '公式有效' : '公式无效或为空'}
            </div>
          </div>

          {formulaValid && variables.length > 0 && (
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleValuesChange}
              className="formula-form"
            >
              {variables.map((variable) => {
                // 查找变量对应的中文名
                const field = fieldList.find((f) => f.enCode === variable);
                const isNumeric = field && field.value === 'number';

                return (
                  <Form.Item
                    key={variable}
                    name={variable}
                    label={field ? field.cnName : variable}
                    rules={[
                      { required: true, message: `请输入${field ? field.cnName : variable}` },
                      isNumeric
                        ? {
                            pattern: /^-?\d+(\.\d+)?$/,
                            message: '请输入有效的数字',
                          }
                        : {},
                    ]}
                  >
                    <Input placeholder={`请输入${field ? field.cnName : variable}`} />
                  </Form.Item>
                );
              })}
            </Form>
          )}

          <div className="result-display">
            <h3>计算结果：</h3>
            <div className="result-value">{result || '尚未计算'}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default App;
