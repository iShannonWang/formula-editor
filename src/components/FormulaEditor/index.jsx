import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Layout,
  Input,
  Button,
  Space,
  Card,
  Typography,
  Divider,
  Tag,
  List,
  Collapse,
  Empty,
  message,
  Modal,
  Table,
} from 'antd';
import {
  SearchOutlined,
  CodeOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import styles from './index.module.less';

const { Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

// 简化版公式编辑器（无库依赖）
const FormulaEditor = forwardRef(
  (
    {
      height = '40vh',
      fields,
      fieldTypes,
      fieldTypeConfigs,
      functionGroups,
      functionDefinitions,
      onChange,
    },
    ref,
  ) => {
    // 状态管理
    const [formula, setFormula] = useState('');
    const [searchFieldTerm, setSearchFieldTerm] = useState('');
    const [searchFuncTerm, setSearchFuncTerm] = useState('');
    const [selectedFunction, setSelectedFunction] = useState(null);
    const [error, setError] = useState(null);
    const [messageApi, contextHolder] = message.useMessage();
    const [validationResult, setValidationResult] = useState(null);
    const [functionDetailVisible, setFunctionDetailVisible] = useState(false);

    // 引用
    const editorRef = useRef(null);
    const highlightLayerRef = useRef(null);

    // 函数名列表
    const allFunctionNames = Object.keys(functionDefinitions);

    // 获取字段名列表
    const fieldNames = fields.map((field) => field.name);

    // 创建字段映射对象（中文 -> 英文）
    const fieldNameMapping = {};
    fields.forEach((field) => {
      fieldNameMapping[field.name] = field.mapping;
    });

    // 创建字段类型映射
    const fieldTypeMapping = {};
    fields.forEach((field) => {
      fieldTypeMapping[field.name] = field.type;
    });

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      // 获取原始公式
      getFormula: () => formula,

      // 获取翻译后的公式（中文 -> 英文）
      getTranslatedFormula: () => translateFormula(formula, fieldNameMapping),

      // 验证公式并返回结果
      validateAndTranslate: () => {
        const result = validateFormula(formula);

        if (result.isValid) {
          const translatedFormula = translateFormula(formula, fieldNameMapping);
          const variables = extractVariables(formula);

          return {
            isValid: true,
            originalFormula: formula,
            translatedFormula,
            variables,
          };
        } else {
          return {
            isValid: false,
            error: result.error,
          };
        }
      },

      // 手动设置公式
      setFormula: (newFormula) => {
        setFormula(newFormula);
        updateHighlight(newFormula);
      },
    }));

    // 工具函数：翻译公式
    const translateFormula = (formulaText, mapping) => {
      if (!formulaText) return '';

      // 创建一个临时的文本，在字段周围添加特殊标记，以便稍后替换
      let tempText = ' ' + formulaText + ' '; // 添加空格便于处理开头和结尾的字段

      // 按字段名长度排序，先替换较长的字段名
      const sortedFieldNames = Object.keys(mapping).sort((a, b) => b.length - a.length);

      // 第一步：用唯一标记替换字段名，避免重叠替换问题
      for (let i = 0; i < sortedFieldNames.length; i++) {
        const fieldName = sortedFieldNames[i];
        // 应仅匹配完整字段名（不作为其他字段的一部分）
        const pattern = new RegExp(
          `([^\\w\\u4e00-\\u9fa5])(${fieldName})([^\\w\\u4e00-\\u9fa5])`,
          'g',
        );
        tempText = tempText.replace(pattern, `$1###FIELD_${i}###$3`);
      }

      // 第二步：将唯一标记替换为英文映射
      for (let i = 0; i < sortedFieldNames.length; i++) {
        const fieldName = sortedFieldNames[i];
        const englishName = mapping[fieldName];
        tempText = tempText.replace(new RegExp(`###FIELD_${i}###`, 'g'), englishName);
      }

      // 删除开头和结尾添加的空格
      return tempText.substring(1, tempText.length - 1);
    };

    // 工具函数：提取变量
    const extractVariables = (formulaText) => {
      if (!formulaText) return [];

      const variables = [];

      // 提取函数参数部分
      const funcMatch = formulaText.match(/^([A-Za-z]+)\((.*)\)$/);
      if (!funcMatch) return [];

      const paramsText = funcMatch[2];
      const params = paramsText.split(',').map((p) => p.trim());

      // 检查每个参数是否是字段
      for (const param of params) {
        // 跳过数字常量
        if (!isNaN(parseFloat(param)) && isFinite(param)) {
          continue;
        }

        // 跳过字符串常量
        if (
          (param.startsWith('"') && param.endsWith('"')) ||
          (param.startsWith("'") && param.endsWith("'"))
        ) {
          continue;
        }

        // 检查是否是已知字段
        const field = fields.find((f) => f.name === param || f.mapping === param);
        if (field && !variables.find((v) => v.name === field.name)) {
          variables.push({
            name: field.name,
            type: field.type,
            mapping: field.mapping,
          });
        }
      }

      return variables;
    };

    // 增强的验证函数 - 实现更健壮的嵌套函数解析
    const validateFormula = (formulaText) => {
      if (!formulaText || formulaText.trim() === '') {
        return {
          isValid: false,
          error: '公式不能为空',
        };
      }

      // 基本格式检查: 必须以函数名开头，后跟括号
      const funcNameMatch = formulaText.match(/^([A-Za-z]+)\(/);
      if (!funcNameMatch) {
        return {
          isValid: false,
          error: '公式格式错误: 必须以函数名开头',
        };
      }

      const functionName = funcNameMatch[1].toUpperCase();
      const funcDef = functionDefinitions[functionName];

      if (!funcDef) {
        return {
          isValid: false,
          error: `公式格式错误: 未知函数 "${functionName}"`,
        };
      }

      // 括号匹配检查
      let parensCount = 0;
      for (let char of formulaText) {
        if (char === '(') parensCount++;
        if (char === ')') parensCount--;
        if (parensCount < 0) {
          return {
            isValid: false,
            error: '括号不匹配',
          };
        }
      }

      if (parensCount !== 0) {
        return {
          isValid: false,
          error: '括号不匹配',
        };
      }

      try {
        // 使用更健壮的方法解析参数，考虑嵌套函数
        const { params, isValid, error } = parseParameters(formulaText);

        if (!isValid) {
          return { isValid, error };
        }

        // 参数数量检查
        const minArgs = funcDef.params
          ? funcDef.params.filter((p) => !p.name.includes('...')).length
          : funcDef.minArgs || 0;

        const maxArgs =
          funcDef.params && funcDef.params.some((p) => p.name.includes('...'))
            ? Infinity
            : funcDef.maxArgs || minArgs;

        if (params.length < minArgs) {
          return {
            isValid: false,
            error: `函数 ${functionName} 至少需要 ${minArgs} 个参数，但只提供了 ${params.length} 个`,
          };
        }

        if (maxArgs !== Infinity && params.length > maxArgs) {
          return {
            isValid: false,
            error: `函数 ${functionName} 最多接受 ${maxArgs} 个参数，但提供了 ${params.length} 个`,
          };
        }

        // 对每个参数递归验证
        if (['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'AVERAGE'].includes(functionName)) {
          // 数值运算函数：参数必须是数值类型的字段、数字常量或返回数值的函数
          for (let i = 0; i < params.length; i++) {
            const param = params[i];
            const paramType = validateParameter(param);

            if (paramType.isValid) {
              if (paramType.type !== fieldTypes.NUMBER && paramType.type !== 'number-function') {
                return {
                  isValid: false,
                  error: `函数 ${functionName} 的参数必须是数值类型，但参数 ${i + 1} 是 ${
                    paramType.type
                  } 类型`,
                };
              }
            } else {
              return paramType; // 返回验证错误
            }
          }
        } else if (functionName === 'CONCATENATE') {
          // 文本连接函数：参数可以是任何类型，会自动转换为文本
          // 仅检查每个参数的合法性
          for (let i = 0; i < params.length; i++) {
            const paramType = validateParameter(params[i]);
            if (!paramType.isValid) {
              return paramType; // 返回验证错误
            }
          }
        } else if (['GT', 'LT', 'GTE', 'LTE'].includes(functionName)) {
          // 比较函数：参数类型必须匹配（同为数值或同为文本）
          if (params.length >= 2) {
            const paramType1 = validateParameter(params[0]);
            const paramType2 = validateParameter(params[1]);

            if (!paramType1.isValid) return paramType1;
            if (!paramType2.isValid) return paramType2;

            const isType1Number =
              paramType1.type === fieldTypes.NUMBER || paramType1.type === 'number-function';
            const isType2Number =
              paramType2.type === fieldTypes.NUMBER || paramType2.type === 'number-function';

            if (isType1Number !== isType2Number) {
              return {
                isValid: false,
                error: `函数 ${functionName} 的参数类型必须匹配，但提供的参数类型不一致`,
              };
            }
          }
        } else {
          // 其他类型的函数，只验证参数的合法性
          for (let i = 0; i < params.length; i++) {
            const paramType = validateParameter(params[i]);
            if (!paramType.isValid) {
              return paramType; // 返回验证错误
            }
          }
        }

        return {
          isValid: true,
          functionName,
          parameters: params,
        };
      } catch (error) {
        return {
          isValid: false,
          error: `公式解析错误: ${error.message}`,
        };
      }
    };

    // 解析参数列表，考虑嵌套函数
    const parseParameters = (formulaText) => {
      // 提取括号内的内容
      const start = formulaText.indexOf('(') + 1;
      const end = formulaText.lastIndexOf(')');
      const parametersText = formulaText.substring(start, end);

      // 如果为空，返回空数组
      if (!parametersText.trim()) {
        return { params: [], isValid: true };
      }

      // 检查连续的逗号（表示空参数）
      if (parametersText.includes(',,')) {
        return {
          isValid: false,
          error: '公式格式错误: 连续的逗号表示空参数',
        };
      }

      // 使用栈来处理嵌套括号
      const params = [];
      let currentParam = '';
      let nestLevel = 0;

      for (let i = 0; i < parametersText.length; i++) {
        const char = parametersText[i];

        if (char === '(') {
          nestLevel++;
          currentParam += char;
        } else if (char === ')') {
          nestLevel--;
          currentParam += char;
        } else if (char === ',' && nestLevel === 0) {
          // 只在最外层处理逗号分隔
          params.push(currentParam.trim());
          currentParam = '';
        } else {
          currentParam += char;
        }
      }

      // 添加最后一个参数
      if (currentParam.trim()) {
        params.push(currentParam.trim());
      }

      return { params, isValid: true };
    };

    // 验证单个参数，返回其类型
    const validateParameter = (param) => {
      // 检查是否是数字
      if (!isNaN(parseFloat(param)) && isFinite(param)) {
        return { isValid: true, type: fieldTypes.NUMBER };
      }

      // 检查是否是字符串常量
      if (
        (param.startsWith('"') && param.endsWith('"')) ||
        (param.startsWith("'") && param.endsWith("'"))
      ) {
        return { isValid: true, type: fieldTypes.TEXT };
      }

      // 检查是否是字段
      const field = fields.find((f) => f.name === param);
      if (field) {
        return { isValid: true, type: field.type };
      }

      // 检查是否是嵌套函数
      const nestedFuncMatch = param.match(/^([A-Za-z]+)\(/);
      if (nestedFuncMatch && param.endsWith(')')) {
        const nestedFuncName = nestedFuncMatch[1].toUpperCase();

        // 检查是否是有效的函数
        if (!functionDefinitions[nestedFuncName]) {
          return {
            isValid: false,
            error: `未知的嵌套函数: ${nestedFuncName}`,
          };
        }

        // 递归验证嵌套函数
        const nestedValidation = validateFormula(param);
        if (!nestedValidation.isValid) {
          return nestedValidation;
        }

        // 返回函数的返回类型
        if (['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'AVERAGE'].includes(nestedFuncName)) {
          return { isValid: true, type: 'number-function' };
        } else if (['CONCATENATE'].includes(nestedFuncName)) {
          return { isValid: true, type: fieldTypes.TEXT };
        } else if (
          ['AND', 'OR', 'NOT', 'ISEMPTY', 'EQ', 'GT', 'LT', 'GTE', 'LTE'].includes(nestedFuncName)
        ) {
          return { isValid: true, type: 'boolean-function' };
        } else {
          return { isValid: true, type: 'unknown-function' };
        }
      }

      // 无法识别的参数
      return {
        isValid: false,
        error: `无法识别的参数: "${param}"`,
      };
    };

    // 辅助函数：获取参数类型
    const getParamType = (param) => {
      // 如果是数字常量
      if (!isNaN(parseFloat(param)) && isFinite(param)) {
        return fieldTypes.NUMBER;
      }

      // 如果是字段名
      const field = fields.find((f) => f.name === param);
      if (field) {
        return field.type;
      }

      // 如果是字符串常量（用引号括起来）
      if (
        (param.startsWith('"') && param.endsWith('"')) ||
        (param.startsWith("'") && param.endsWith("'"))
      ) {
        return fieldTypes.TEXT;
      }

      // 检查是否是嵌套函数调用
      const nestedFuncMatch = param.match(/^([A-Za-z]+)\(/);
      if (nestedFuncMatch) {
        const functionName = nestedFuncMatch[1].toUpperCase();
        // 如果是数值类型的函数，返回NUMBER类型
        if (['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'AVERAGE'].includes(functionName)) {
          return fieldTypes.NUMBER;
        }
        // 如果是逻辑类型的函数，返回逻辑类型
        if (
          ['AND', 'OR', 'NOT', 'ISEMPTY', 'EQ', 'GT', 'LT', 'GTE', 'LTE'].includes(functionName)
        ) {
          return 'boolean';
        }
        // 如果是文本函数，返回TEXT类型
        if (['CONCATENATE'].includes(functionName)) {
          return fieldTypes.TEXT;
        }
      }

      // 无法确定类型
      return null;
    };

    // 高亮更新函数
    const updateHighlight = (text) => {
      if (!highlightLayerRef.current) return;

      let highlightedHtml = text;

      // 高亮函数名
      allFunctionNames.forEach((funcName) => {
        const pattern = new RegExp(`\\b(${funcName})\\(`, 'g');
        highlightedHtml = highlightedHtml.replace(
          pattern,
          `<span class="${styles.highlightFunction}">$1</span>(`,
        );
      });

      // 高亮字段名
      fieldNames.forEach((fieldName) => {
        const fieldType = fieldTypeMapping[fieldName];
        const pattern = new RegExp(`\\b(${fieldName})\\b`, 'g');
        highlightedHtml = highlightedHtml.replace(
          pattern,
          `<span class="${styles.highlightField} ${
            styles['highlight' + fieldType.charAt(0).toUpperCase() + fieldType.slice(1)]
          }">${fieldName}</span>`,
        );
      });

      // 高亮括号和逗号
      highlightedHtml = highlightedHtml
        .replace(/(\(|\))/g, `<span class="${styles.highlightBracket}">$1</span>`)
        .replace(/,/g, `<span class="${styles.highlightComma}">,</span>`);

      // 更新高亮层
      highlightLayerRef.current.innerHTML = highlightedHtml;
    };

    // 处理编辑器内容变化
    const handleEditorChange = (e) => {
      const newFormula = e.target.value;
      setFormula(newFormula);
      setError(null);
      setValidationResult(null);
      updateHighlight(newFormula);

      if (onChange) {
        onChange(newFormula);
      }
    };

    // 获取TextArea原生DOM元素
    const getTextAreaElement = () => {
      if (editorRef.current) {
        // Access the native textarea element inside antd's TextArea
        return editorRef.current.resizableTextArea.textArea;
      }
      return null;
    };

    // 插入字段
    const insertField = (fieldName) => {
      const textAreaElement = getTextAreaElement();
      if (textAreaElement) {
        const start = textAreaElement.selectionStart;
        const end = textAreaElement.selectionEnd;
        const beforeCursor = formula.substring(0, start);
        const afterCursor = formula.substring(end);

        // 查找最后一个未关闭的左括号
        const lastOpenParenPos = beforeCursor.lastIndexOf('(');
        const lastCloseParenPos = beforeCursor.lastIndexOf(')');

        let insert = fieldName;

        // 如果光标在函数括号内
        if (lastOpenParenPos > lastCloseParenPos) {
          const afterParen = beforeCursor.substring(lastOpenParenPos + 1).trim();

          if (afterParen === '') {
            // 括号内是空的
            insert = fieldName;
          } else {
            // 检查最后一个非空字符是否是逗号
            const lastNonSpaceChar = afterParen.trim().slice(-1);

            if (lastNonSpaceChar === ',') {
              // 最后是逗号，添加空格和字段
              insert = ' ' + fieldName;
            } else {
              // 最后不是逗号，添加逗号、空格和字段
              insert = ', ' + fieldName;
            }
          }
        }

        const newFormula = beforeCursor + insert + afterCursor;
        setFormula(newFormula);
        updateHighlight(newFormula);

        // 需要在状态更新后设置光标位置
        setTimeout(() => {
          const newCursorPos = start + insert.length;
          textAreaElement.focus();
          textAreaElement.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);

        if (onChange) {
          onChange(newFormula);
        }

        messageApi.success(`已添加: ${fieldName}`);
      }
    };

    // 插入函数
    const insertFunction = (funcName) => {
      const textAreaElement = getTextAreaElement();
      if (textAreaElement) {
        const fn = functionDefinitions[funcName];
        setSelectedFunction({ ...fn, name: funcName });

        const start = textAreaElement.selectionStart;
        const end = textAreaElement.selectionEnd;
        const beforeCursor = formula.substring(0, start);
        const afterCursor = formula.substring(end);

        const insert = funcName + '()';
        const newFormula = beforeCursor + insert + afterCursor;

        setFormula(newFormula);
        updateHighlight(newFormula);

        // 需要在状态更新后设置光标位置
        setTimeout(() => {
          const newCursorPos = start + funcName.length + 1;
          textAreaElement.focus();
          textAreaElement.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);

        if (onChange) {
          onChange(newFormula);
        }

        messageApi.success(`已插入函数: ${funcName}`);
      }
    };

    // 验证公式
    const validateFormulaHandler = () => {
      try {
        const result = validateFormula(formula);

        if (!result.isValid) {
          setError(result.error);
          messageApi.error(result.error);
          return false;
        }

        // 翻译公式（中文 -> 英文）
        const translatedFormula = translateFormula(formula, fieldNameMapping);

        // 提取变量 - 既检查原始公式也检查翻译后的公式
        let variables = extractVariables(formula);

        // 如果从原始公式中没有提取到变量，尝试从翻译后的公式中提取
        if (variables.length === 0) {
          // 从英文公式中识别字段映射
          const englishFields = fields.map((field) => field.mapping);

          // 提取函数参数部分
          const funcMatch = translatedFormula.match(/^([A-Za-z]+)\((.*)\)$/);
          if (funcMatch) {
            const paramsText = funcMatch[2];
            const params = paramsText.split(',').map((p) => p.trim());

            // 检查每个参数是否是已知字段映射
            for (const param of params) {
              if (englishFields.includes(param)) {
                const field = fields.find((f) => f.mapping === param);
                if (field && !variables.find((v) => v.mapping === param)) {
                  variables.push({
                    name: field.name,
                    type: field.type,
                    mapping: field.mapping,
                  });
                }
              }
            }
          }
        }

        // 显示成功消息
        messageApi.success('公式格式正确');
        setError(null);
        return true;
      } catch (err) {
        console.error('验证错误:', err);
        setError('验证错误: ' + err.message);
        messageApi.error('验证错误: ' + err.message);
        return false;
      }
    };

    // 初始化时设置高亮
    useEffect(() => {
      if (formula) {
        updateHighlight(formula);
      }
    }, []);

    // 过滤字段
    const filteredFields = fields.filter((field) =>
      field.name.toLowerCase().includes(searchFieldTerm.toLowerCase()),
    );

    // 过滤函数组
    const filteredFunctionGroups = {};
    Object.keys(functionGroups).forEach((group) => {
      const groupFunctions = functionGroups[group].filter((func) =>
        func.toLowerCase().includes(searchFuncTerm.toLowerCase()),
      );
      if (groupFunctions.length > 0) {
        filteredFunctionGroups[group] = groupFunctions;
      }
    });

    // 获取类型标签颜色
    const getTypeColor = (type) => {
      const config = fieldTypeConfigs[type] || fieldTypeConfigs[fieldTypes.TEXT];
      return config.color;
    };

    // 渲染字段项
    const renderFieldItem = (field) => {
      return (
        <List.Item
          key={field.name}
          onClick={() => insertField(field.name)}
          className={styles.fieldItem}
        >
          <div className={styles.fieldItemContent}>
            <Text>{field.name}</Text>
            <Tag color={getTypeColor(field.type)}>{field.type}</Tag>
          </div>
        </List.Item>
      );
    };

    // 渲染字段列表
    const renderFieldGroups = () => {
      return (
        <div className={styles.fieldsContainer}>
          <List
            size="small"
            dataSource={filteredFields}
            renderItem={renderFieldItem}
            locale={{
              emptyText: (
                <Empty
                  description="没有找到匹配的字段"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </div>
      );
    };

    // 渲染函数分组
    const renderFunctionGroups = () => {
      return (
        <Collapse
          defaultActiveKey={['基础运算', '逻辑函数']}
          ghost
          expandIcon={({ isActive }) => (
            <RightOutlined
              rotate={isActive ? 90 : 0}
              style={{ fontSize: '12px' }}
            />
          )}
          className={styles.collapsePanel}
        >
          {Object.keys(filteredFunctionGroups).map((group) => (
            <Panel
              header={<Text strong>{group}</Text>}
              key={group}
            >
              <List
                size="small"
                dataSource={filteredFunctionGroups[group]}
                renderItem={(func) => (
                  <List.Item
                    key={func}
                    onClick={() => insertFunction(func)}
                    className={styles.functionItem}
                  >
                    <Text>{func}</Text>
                  </List.Item>
                )}
              />
            </Panel>
          ))}
        </Collapse>
      );
    };

    // 组件样式
    const containerStyle = {
      height: height,
      display: 'flex',
      flexDirection: 'column',
      minHeight: '400px',
    };

    return (
      <>
        {contextHolder}
        <Layout
          className={styles.formulaEditorLayout}
          style={containerStyle}
        >
          <Content
            className={styles.formulaContent}
            style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <div className={styles.formulaSection}>
              <div className={styles.formulaHeader}>
                <div className={styles.formulaLabel}>公式编辑</div>
                <Space>
                  <Button
                    type="primary"
                    icon={<CodeOutlined />}
                    onClick={validateFormulaHandler}
                  >
                    验证公式
                  </Button>
                </Space>
              </div>
              <div className={styles.editorWrapper}>
                <div className={styles.editorContainer}>
                  {/* 高亮层 */}
                  <div
                    className={styles.highlightLayer}
                    ref={highlightLayerRef}
                  ></div>

                  {/* 编辑器 */}
                  <TextArea
                    ref={editorRef}
                    className={styles.formulaTextarea}
                    value={formula}
                    onChange={handleEditorChange}
                    spellCheck="false"
                    autoSize={{ minRows: 1, maxRows: 6 }}
                    bordered={false}
                  />
                </div>

                {error && (
                  <div className={styles.errorMessage}>
                    <ExclamationCircleOutlined /> {error}
                  </div>
                )}
              </div>
            </div>

            {/* 面板布局 - 三等分 */}
            <div className={styles.panelsSection}>
              <Layout className={styles.panelsLayout}>
                {/* 左侧字段面板 */}
                <Sider
                  width="33.3%"
                  className={styles.leftSider}
                >
                  <Card
                    title={<Text strong>表单字段</Text>}
                    className={styles.panelCard}
                  >
                    <Input
                      placeholder="搜索字段"
                      prefix={<SearchOutlined />}
                      value={searchFieldTerm}
                      onChange={(e) => setSearchFieldTerm(e.target.value)}
                      className={styles.searchInput}
                      allowClear
                    />
                    <div className={styles.panelContent}>{renderFieldGroups()}</div>
                  </Card>
                </Sider>

                {/* 中间函数面板 */}
                <Content
                  className={styles.middleContent}
                  width="33.3%"
                >
                  <Card
                    title={<Text strong>函数列表</Text>}
                    className={styles.panelCard}
                  >
                    <Input
                      placeholder="搜索函数"
                      prefix={<SearchOutlined />}
                      value={searchFuncTerm}
                      onChange={(e) => setSearchFuncTerm(e.target.value)}
                      className={styles.searchInput}
                      allowClear
                    />
                    <div className={styles.panelContent}>
                      {Object.keys(filteredFunctionGroups).length > 0 ? (
                        renderFunctionGroups()
                      ) : (
                        <Empty
                          description="没有找到匹配的函数"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      )}
                    </div>
                  </Card>
                </Content>

                {/* 右侧说明面板 */}
                <Sider
                  width="33.3%"
                  className={styles.rightSider}
                >
                  <Card
                    title={<Text strong>函数说明</Text>}
                    className={styles.panelCard}
                  >
                    <div className={styles.panelContent}>
                      {selectedFunction ? (
                        <div className={styles.functionDoc}>
                          <Title level={5}>{selectedFunction.name}</Title>
                          <Paragraph>{selectedFunction.description}</Paragraph>
                          <Divider orientation="left">用法</Divider>
                          <div className={styles.syntaxBox}>{selectedFunction.syntax}</div>
                          <Divider orientation="left">示例</Divider>
                          <div className={styles.exampleBox}>{selectedFunction.example}</div>

                          <Button
                            type="link"
                            icon={<QuestionCircleOutlined />}
                            onClick={() => setFunctionDetailVisible(true)}
                          >
                            查看详情
                          </Button>
                        </div>
                      ) : (
                        <Empty
                          description="请从左侧选择一个函数以查看详细信息"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      )}
                    </div>
                  </Card>
                </Sider>
              </Layout>
            </div>
          </Content>
        </Layout>

        {/* 函数详情弹窗 */}
        <Modal
          title={`${selectedFunction?.name || ''} 函数详情`}
          open={functionDetailVisible}
          onCancel={() => setFunctionDetailVisible(false)}
          footer={[
            <Button
              key="close"
              onClick={() => setFunctionDetailVisible(false)}
            >
              关闭
            </Button>,
          ]}
          width={700}
          className={styles.functionDetailModal}
        >
          {selectedFunction && (
            <div className={styles.functionDetailContent}>
              <Paragraph>{selectedFunction.details || selectedFunction.description}</Paragraph>

              <Divider orientation="left">语法</Divider>
              <div className={styles.syntaxBox}>{selectedFunction.syntax}</div>

              <Divider orientation="left">参数说明</Divider>
              {selectedFunction.params && selectedFunction.params.length > 0 ? (
                <Table
                  dataSource={selectedFunction.params}
                  columns={[
                    {
                      title: '参数名',
                      dataIndex: 'name',
                      key: 'name',
                      width: 150,
                    },
                    {
                      title: '描述',
                      dataIndex: 'description',
                      key: 'description',
                    },
                  ]}
                  pagination={false}
                  size="small"
                  bordered
                />
              ) : (
                <Paragraph>此函数没有参数</Paragraph>
              )}

              <Divider orientation="left">使用示例</Divider>
              <div className={styles.exampleBox}>{selectedFunction.example}</div>

              <Divider orientation="left">注意事项</Divider>
              <Paragraph>
                <ul>
                  <li>函数名称不区分大小写，但建议使用大写以提高可读性。</li>
                  <li>参数之间使用逗号分隔，参数周围的空格会被忽略。</li>
                  <li>请确保参数类型正确，否则可能导致计算错误。</li>
                </ul>
              </Paragraph>
            </div>
          )}
        </Modal>
        {/* 移除了公式转换结果弹窗 */}
      </>
    );
  },
);

export default FormulaEditor;
