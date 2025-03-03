// FormulaEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
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
} from '@ant-design/icons';
import {
  EditorView,
  keymap,
  highlightSpecialChars,
  drawSelection,
  Decoration,
  ViewPlugin,
} from '@codemirror/view';
import { EditorState, RangeSet } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentOnInput, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { tags } from '@lezer/highlight';
import * as math from 'mathjs';
import './index.css';

// 导入常量配置
import {
  FIELD_TYPES,
  FIELD_TYPE_CONFIGS,
  FIELDS,
  FUNCTION_GROUPS,
  FUNCTIONS,
} from '../../constants';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// 自定义语法高亮类型和字段名
const getFieldNames = (fields) => fields.map((field) => field.name);

// 创建字段映射对象
const createFieldNameMapping = (fields) => {
  const mapping = {};
  fields.forEach((field) => {
    mapping[field.name] = field.mapping;
  });
  return mapping;
};

// 公式编辑器组件
const FormulaEditor = ({
  height = '600px',
  fields = FIELDS,
  fieldTypes = FIELD_TYPES,
  fieldTypeConfigs = FIELD_TYPE_CONFIGS,
  functionGroups = FUNCTION_GROUPS,
  functionDefinitions = FUNCTIONS,
}) => {
  // 从传入的字段列表获取所有字段名和映射
  const fieldNames = getFieldNames(fields);
  const fieldNameMapping = createFieldNameMapping(fields);
  // 根据字段类型获取CSS类名
  const getFieldClassName = (fieldName) => {
    const field = fields.find((f) => f.name === fieldName);
    if (!field) return 'field-text'; // 默认文本类型

    switch (field.type) {
      case fieldTypes.NUMBER:
        return 'field-number';
      case fieldTypes.DATETIME:
        return 'field-datetime';
      case fieldTypes.TEXT:
      default:
        return 'field-text';
    }
  };

  // 自定义语法高亮
  const formulaSyntax = syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.keyword, color: '#7c4dff' }, // 关键字 - 深紫色
      { tag: tags.string, color: '#29b6f6' }, // 字符串 - 亮蓝色
      { tag: tags.number, color: '#ff9100' }, // 数字 - 橙色
      { tag: tags.function(tags.variableName), color: '#00c853' }, // 函数 - 绿色
      { tag: tags.operator, color: '#f50057' }, // 运算符 - 粉红色
      { tag: tags.comment, color: '#757575' }, // 注释 - 灰色
      { tag: tags.bracket, color: '#546e7a' }, // 括号 - 灰蓝色
      { tag: tags.className, color: '#ec407a' }, // 类名 - 粉红色
      { tag: tags.variableName, color: '#2196f3', fontWeight: 'bold' }, // 变量名 - 高亮蓝色并加粗
      { tag: tags.propertyName, color: '#2196f3', fontWeight: 'bold' }, // 字段名高亮
    ]),
  );

  // 状态定义
  const [formula, setFormula] = useState('');
  const [searchFieldTerm, setSearchFieldTerm] = useState('');
  const [searchFuncTerm, setSearchFuncTerm] = useState('');
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [error, setError] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  // 弹窗状态
  const [functionDetailVisible, setFunctionDetailVisible] = useState(false);
  const [testResultVisible, setTestResultVisible] = useState(false);
  const [testResultData, setTestResultData] = useState(null);
  // 新增: 翻译弹窗状态
  const [translatedFormulaVisible, setTranslatedFormulaVisible] = useState(false);
  const [translatedFormula, setTranslatedFormula] = useState('');

  // CodeMirror 编辑器引用
  const editorRef = useRef(null);
  const cmViewRef = useRef(null);
  const exampleEditorRef = useRef(null);
  const exampleCmViewRef = useRef(null);

  // 函数定义
  const functions = {
    UPDATE: {
      description: '更新数据库记录',
      syntax: 'UPDATE(表名)',
      example: 'UPDATE(存货表)',
      details:
        '此函数用于更新数据库中的记录。通常与条件函数搭配使用，例如EQ()。当条件满足时，更新指定表中的记录。',
      params: [{ name: '表名', description: '要更新的数据表名称' }],
    },
    ADD: {
      description: '将两个或多个数字相加',
      syntax: 'ADD(number1, number2, ...)',
      example: 'ADD(10, 20, 30) 返回 60',
      details: 'ADD函数将所有参数相加并返回结果。可以接受任意数量的数值参数。',
      params: [
        { name: 'number1', description: '第一个数值' },
        { name: 'number2', description: '第二个数值' },
        { name: '...', description: '可选的额外数值' },
      ],
    },
    SUBTRACT: {
      description: '从第一个数字中减去第二个数字',
      syntax: 'SUBTRACT(number1, number2)',
      example: 'SUBTRACT(30, 10) 返回 20',
      details: 'SUBTRACT函数从第一个参数中减去第二个参数并返回结果。',
      params: [
        { name: 'number1', description: '被减数' },
        { name: 'number2', description: '减数' },
      ],
    },
    MULTIPLY: {
      description: '将两个或多个数字相乘',
      syntax: 'MULTIPLY(number1, number2, ...)',
      example: 'MULTIPLY(2, 3, 4) 返回 24',
      details: 'MULTIPLY函数将所有参数相乘并返回结果。可以接受任意数量的数值参数。',
      params: [
        { name: 'number1', description: '第一个数值' },
        { name: 'number2', description: '第二个数值' },
        { name: '...', description: '可选的额外数值' },
      ],
    },
    DIVIDE: {
      description: '将第一个数字除以第二个数字',
      syntax: 'DIVIDE(number1, number2)',
      example: 'DIVIDE(10, 2) 返回 5',
      details: 'DIVIDE函数用第一个参数除以第二个参数并返回结果。如果第二个参数为0，将返回错误。',
      params: [
        { name: 'number1', description: '被除数' },
        { name: 'number2', description: '除数（不能为0）' },
      ],
    },
    IF: {
      description: '根据条件返回不同的值',
      syntax: 'IF(condition, value_if_true, value_if_false)',
      example: 'IF(A1 > 10, "大于10", "小于等于10")',
      details:
        'IF函数根据指定的条件测试，返回不同的值。如果条件结果为TRUE，则返回第二个参数；如果条件结果为FALSE，则返回第三个参数。',
      params: [
        { name: 'condition', description: '要测试的条件（返回TRUE或FALSE的表达式）' },
        { name: 'value_if_true', description: '如果条件为TRUE，则返回此值' },
        { name: 'value_if_false', description: '如果条件为FALSE，则返回此值' },
      ],
    },
    ISEMPTY: {
      description: '检查值是否为空',
      syntax: 'ISEMPTY(value)',
      example: 'ISEMPTY(A1) 如果A1为空则返回true',
      details:
        'ISEMPTY函数检查指定值是否为空（NULL、空字符串或未定义）。如果值为空，则返回TRUE；否则返回FALSE。',
      params: [{ name: 'value', description: '要检查的值' }],
    },
    AVERAGE: {
      description: 'AVERAGE函数可以获取一组数值的算术平均值',
      syntax: 'AVERAGE(数字1,数字2,...)',
      example: 'AVERAGE( 物理成绩, 化学成绩, 生物成绩 ) 返回三门课程的平均分',
      details: 'AVERAGE函数计算所有参数的算术平均值。忽略文本值和空值。',
      params: [
        { name: '数字1', description: '第一个数值' },
        { name: '数字2', description: '第二个数值' },
        { name: '...', description: '可选的额外数值' },
      ],
    },
    CONCATENATE: {
      description: '将多个文本值合并为一个文本值',
      syntax: 'CONCATENATE(text1, text2, ...)',
      example: 'CONCATENATE("Hello ", "World") 返回 "Hello World"',
      details: 'CONCATENATE函数将所有文本参数连接成一个文本字符串。非文本值会被自动转换为文本。',
      params: [
        { name: 'text1', description: '第一个文本值' },
        { name: 'text2', description: '第二个文本值' },
        { name: '...', description: '可选的额外文本值' },
      ],
    },
    SUM: {
      description: '求和函数',
      syntax: 'SUM(number1, number2, ...)',
      example: 'SUM(1, 2, 3, 4) 返回 10',
      details: 'SUM函数计算所有数值参数的总和。忽略文本值和逻辑值。',
      params: [
        { name: 'number1', description: '第一个数值' },
        { name: 'number2', description: '第二个数值' },
        { name: '...', description: '可选的额外数值' },
      ],
    },
    LOGINUSER: {
      description: '返回当前登录用户信息',
      syntax: 'LOGINUSER()',
      example: 'LOGINUSER() 返回当前登录用户',
      details: 'LOGINUSER函数返回当前登录用户的信息，例如用户ID、用户名、角色等。',
      params: [],
    },
    EQ: {
      description: '判断两个值是否相等',
      syntax: 'EQ(value1, value2)',
      example: 'EQ(A1, B1) 如果A1等于B1则返回true',
      details: 'EQ函数比较两个值是否相等。如果相等，则返回TRUE；否则返回FALSE。',
      params: [
        { name: 'value1', description: '第一个要比较的值' },
        { name: 'value2', description: '第二个要比较的值' },
      ],
    },
    AND: {
      description: '如果所有参数都为真，则返回TRUE',
      syntax: 'AND(logical1, logical2, ...)',
      example: 'AND(A1>10, A2<20) 如果两个条件都满足则返回true',
      details: 'AND函数检查所有参数是否都为TRUE。如果所有参数都为TRUE，则返回TRUE；否则返回FALSE。',
      params: [
        { name: 'logical1', description: '第一个逻辑表达式' },
        { name: 'logical2', description: '第二个逻辑表达式' },
        { name: '...', description: '可选的额外逻辑表达式' },
      ],
    },
    OR: {
      description: '如果任何参数为真，则返回TRUE',
      syntax: 'OR(logical1, logical2, ...)',
      example: 'OR(A1>10, A2<20) 如果任一条件满足则返回true',
      details:
        'OR函数检查是否至少有一个参数为TRUE。如果有任何参数为TRUE，则返回TRUE；否则返回FALSE。',
      params: [
        { name: 'logical1', description: '第一个逻辑表达式' },
        { name: 'logical2', description: '第二个逻辑表达式' },
        { name: '...', description: '可选的额外逻辑表达式' },
      ],
    },
  };

  // 示例公式

  // 第二个示例
  const secondExampleFormula = 'ADD([出货量], [商品名], ,)';

  // 自定义CodeMirror配置 - 添加对变量的识别
  const createVariableHighlighter = () => {
    // 创建一个装饰器类来高亮字段名
    const createDecorations = (view) => {
      const decorations = [];
      const text = view.state.doc.toString();

      // 遍历所有字段
      for (const fieldName of fieldNames) {
        let startPos = 0;

        // 查找所有匹配项
        while (true) {
          // 确保不匹配函数名中的字段名，只匹配参数中的字段名
          // 例如: 如果字段名是"SUM"，不应该匹配函数名"SUM"，只匹配参数中的"SUM"
          const fieldPos = text.indexOf(fieldName, startPos);
          if (fieldPos === -1) break;

          // 检查前后字符，确保这是一个独立的字段名
          const prevChar = fieldPos > 0 ? text[fieldPos - 1] : '';
          const nextChar =
            fieldPos + fieldName.length < text.length ? text[fieldPos + fieldName.length] : '';

          const isFieldName =
            // 确保前面不是字母或数字
            !/[a-zA-Z0-9_\]]/.test(prevChar) &&
            // 确保后面不是字母或数字
            !/[a-zA-Z0-9_\[]/.test(nextChar);

          if (isFieldName) {
            // 获取字段类型对应的CSS类名
            const fieldClass = getFieldClassName(fieldName);

            // 创建装饰器标记
            const from = fieldPos;
            const to = from + fieldName.length;

            decorations.push({
              from,
              to,
              value: Decoration.mark({
                class: fieldClass,
              }),
            });
          }

          startPos = fieldPos + fieldName.length;
        }
      }

      return decorations.length ? RangeSet.of(decorations) : RangeSet.empty;
    };

    // 创建视图插件
    return ViewPlugin.fromClass(
      class {
        decorations = RangeSet.empty;

        constructor(view) {
          this.decorations = createDecorations(view);
        }

        update(update) {
          if (update.docChanged) {
            // 文档变化时更新装饰器
            this.decorations = createDecorations(update.view);

            // 更新公式状态
            setFormula(update.state.doc.toString());
            setError(null);
          }
        }
      },
      {
        decorations: (v) => v.decorations,
      },
    );
  };

  // 初始化 CodeMirror - 主编辑器
  useEffect(() => {
    if (editorRef.current && !cmViewRef.current) {
      const startState = EditorState.create({
        doc: formula,
        extensions: [
          history(),
          drawSelection(),
          indentOnInput(),
          formulaSyntax,
          highlightSpecialChars(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          javascript({
            jsx: true,
            typescript: false,
          }),
          createVariableHighlighter(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              setFormula(update.state.doc.toString());
              setError(null);
            }
          }),
          EditorView.theme({
            '&': {
              fontSize: '14px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              backgroundColor: '#fff',
              height: '100%',
            },
            '.cm-content': {
              fontFamily: "'Fira Code', monospace",
              padding: '8px 12px',
            },
            '.cm-line': {
              padding: '2px 0',
            },
            '.cm-cursor': {
              borderLeftColor: '#1890ff',
              borderLeftWidth: '2px',
            },
            '.cm-activeLine': {
              backgroundColor: '#e6f7ff',
            },
            '.cm-selectionBackground': {
              backgroundColor: '#bae7ff !important',
            },
            '.cm-selectionMatch': {
              backgroundColor: '#bae7ff4d',
            },
            // 添加变量高亮样式
            '.cm-variableName': {
              color: '#2196f3',
              fontWeight: 'bold',
            },
          }),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      cmViewRef.current = view;

      return () => {
        view.destroy();
        cmViewRef.current = null;
      };
    }
  }, [editorRef.current]);

  // 初始化 CodeMirror - 示例公式编辑器
  useEffect(() => {
    if (exampleEditorRef.current && !exampleCmViewRef.current) {
      // 更新示例公式，不再使用方括号
      const updatedExampleFormula = 'ADD(出货量, 商品名, ,)';

      const exampleState = EditorState.create({
        doc: updatedExampleFormula,
        extensions: [
          history(),
          drawSelection(),
          indentOnInput(),
          formulaSyntax,
          highlightSpecialChars(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          javascript({
            jsx: true,
            typescript: false,
          }),
          createVariableHighlighter(),
          EditorView.theme({
            '&': {
              fontSize: '14px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              backgroundColor: '#fff',
              maxHeight: '60px',
              overflow: 'auto',
            },
            '.cm-content': {
              fontFamily: "'Fira Code', monospace",
              padding: '8px 12px',
            },
            '.cm-line': {
              padding: '2px 0',
            },
            '.cm-cursor': {
              borderLeftColor: '#1890ff',
              borderLeftWidth: '2px',
            },
          }),
        ],
      });

      const exampleView = new EditorView({
        state: exampleState,
        parent: exampleEditorRef.current,
      });

      exampleCmViewRef.current = exampleView;

      return () => {
        exampleView.destroy();
        exampleCmViewRef.current = null;
      };
    }
  }, [exampleEditorRef.current]);

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

  // 插入字段到公式
  const insertField = (fieldName) => {
    if (cmViewRef.current) {
      const pos = cmViewRef.current.state.selection.main.head;

      // 检查当前光标是否在函数参数内部
      const doc = cmViewRef.current.state.doc.toString();
      const beforeCursor = doc.substring(0, pos);

      // 判断是否需要添加逗号
      // 如果光标前有左括号且没有其他参数，不添加逗号
      // 如果光标前已经有参数，则添加逗号和空格
      let insert = fieldName;
      if (beforeCursor.trim().endsWith('(')) {
        // 在左括号后不需要添加逗号
        insert = fieldName;
      } else if (beforeCursor.includes('(') && !beforeCursor.endsWith(', ')) {
        // 已有参数但没有逗号和空格，添加逗号和空格
        insert = ', ' + fieldName;
      }

      cmViewRef.current.dispatch({
        changes: { from: pos, insert: insert },
      });
      cmViewRef.current.focus();
      messageApi.success(`已添加: ${fieldName}`);
    }
  };

  // 插入函数到公式
  const insertFunction = (funcName) => {
    if (cmViewRef.current) {
      const fn = functionDefinitions[funcName];
      setSelectedFunction({ ...fn, name: funcName });

      const pos = cmViewRef.current.state.selection.main.head;
      let insert = funcName + '()';

      cmViewRef.current.dispatch({
        changes: { from: pos, insert },
      });

      // 将光标置于括号内
      cmViewRef.current.dispatch({
        selection: { anchor: pos + funcName.length + 1 },
      });

      cmViewRef.current.focus();
      messageApi.success(`已插入函数: ${funcName}`);
    }
  };

  // 显示函数详情
  const showFunctionDetail = () => {
    if (selectedFunction) {
      setFunctionDetailVisible(true);
    }
  };

  // 解析并翻译公式
  const translateFormula = (formula) => {
    let translated = formula;

    // 替换所有已知字段名，确保只替换完整的字段名（不是其他单词的一部分）
    Object.keys(fieldNameMapping).forEach((fieldName) => {
      const regex = new RegExp(`\\b${fieldName}\\b`, 'g');
      translated = translated.replace(regex, fieldNameMapping[fieldName]);
    });

    return translated;
  };

  // 验证公式
  const validateFormula = () => {
    try {
      // 基本语法验证
      const formulaText = formula.trim();

      if (!formulaText) {
        setError('公式不能为空');
        messageApi.error('公式不能为空');
        return false;
      }

      // 检查括号匹配
      let parensCount = 0;
      for (let char of formulaText) {
        if (char === '(') parensCount++;
        if (char === ')') parensCount--;
        if (parensCount < 0) {
          setError('括号不匹配');
          messageApi.error('括号不匹配');
          return false;
        }
      }

      if (parensCount !== 0) {
        setError('括号不匹配');
        messageApi.error('括号不匹配');
        return false;
      }

      // 尝试使用 mathjs 解析（基本数学运算）
      if (
        formulaText.includes('+') ||
        formulaText.includes('-') ||
        formulaText.includes('*') ||
        formulaText.includes('/')
      ) {
        try {
          math.parse(formulaText);
        } catch (e) {
          setError('公式格式错误: ' + e.message);
          messageApi.error('公式格式错误: ' + e.message);
          return false;
        }
      }

      // 翻译公式并显示弹窗
      const translatedText = translateFormula(formulaText);
      setTranslatedFormula(translatedText);
      setTranslatedFormulaVisible(true);

      setError(null);
      return true;
    } catch (err) {
      setError('验证错误: ' + err.message);
      messageApi.error('验证错误: ' + err.message);
      return false;
    }
  };

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
        className="field-item"
      >
        <div className="field-item-content">
          <Text>{field.name}</Text>
          <Tag color={getTypeColor(field.type)}>{field.type}</Tag>
        </div>
      </List.Item>
    );
  };

  // 渲染字段分组
  const renderFieldGroups = () => {
    return (
      <div className="fields-container">
        <List
          size="small"
          dataSource={filteredFields}
          renderItem={renderFieldItem}
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
                  className="function-item"
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

  // 组件样式，根据传入的高度自适应
  const containerStyle = {
    height: height,
    display: 'flex',
    flexDirection: 'column',
  };

  const editorSectionStyle = {
    flex: '0 0 auto', // 固定高度
  };

  const panelsSectionStyle = {
    flex: '1 1 auto', // 自动填充剩余空间
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const panelsLayoutStyle = {
    flex: '1 1 auto',
    overflow: 'hidden',
  };

  return (
    <>
      {contextHolder}
      <Layout
        className="formula-editor-layout"
        style={containerStyle}
      >
        <Content
          className="formula-content"
          style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <div
            className="formula-section"
            style={editorSectionStyle}
          >
            <div className="formula-label">公式 =</div>
            <div className="editor-wrapper">
              <div
                className="editor-container"
                ref={editorRef}
              ></div>
              {error && (
                <div className="error-message">
                  <ExclamationCircleOutlined /> {error}
                </div>
              )}
            </div>

            <Space>
              <Button
                type="primary"
                ghost
                icon={<CodeOutlined />}
                onClick={validateFormula}
              >
                验证公式
              </Button>
            </Space>
          </div>

          <div
            className="panels-section"
            style={panelsSectionStyle}
          >
            <Layout
              className="panels-layout"
              style={panelsLayoutStyle}
            >
              <Sider
                width={280}
                className="left-sider"
              >
                <Card
                  title="表单字段"
                  bordered={false}
                  className="panel-card"
                >
                  <Input
                    placeholder="搜索字段..."
                    prefix={<SearchOutlined />}
                    value={searchFieldTerm}
                    onChange={(e) => setSearchFieldTerm(e.target.value)}
                    className="search-input"
                  />
                  <div className="panel-content">{renderFieldGroups()}</div>
                </Card>
              </Sider>

              <Content className="middle-content">
                <Card
                  title="函数列表"
                  bordered={false}
                  className="panel-card"
                >
                  <Input
                    placeholder="搜索函数..."
                    prefix={<SearchOutlined />}
                    value={searchFuncTerm}
                    onChange={(e) => setSearchFuncTerm(e.target.value)}
                    className="search-input"
                  />
                  <div className="panel-content">
                    {Object.keys(filteredFunctionGroups).length > 0 ? (
                      renderFunctionGroups()
                    ) : (
                      <Empty description="没有找到匹配的函数" />
                    )}
                  </div>
                </Card>
              </Content>

              <Sider
                width={280}
                className="right-sider"
              >
                <Card
                  title="函数说明"
                  className="panel-card"
                >
                  <div className="panel-content">
                    {selectedFunction ? (
                      <div className="function-doc">
                        <Title level={5}>{selectedFunction.name}</Title>
                        <Paragraph>{selectedFunction.description}</Paragraph>
                        <Divider orientation="left">用法</Divider>
                        <Paragraph code>{selectedFunction.syntax}</Paragraph>
                        <Divider orientation="left">示例</Divider>
                        <Paragraph>{selectedFunction.example}</Paragraph>
                        <Button
                          type="link"
                          icon={<QuestionCircleOutlined />}
                          onClick={showFunctionDetail}
                        >
                          了解详情
                        </Button>
                      </div>
                    ) : (
                      <Empty description="请从左侧选择一个函数以查看详细信息" />
                    )}
                  </div>
                </Card>
              </Sider>
            </Layout>
          </div>

          <div
            className="actions-section"
            style={{ marginTop: 'auto' }}
          >
            <Space>
              <Button type="primary">确定</Button>
              <Button>取消</Button>
            </Space>
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
      >
        {selectedFunction && (
          <div className="function-detail-modal">
            <Paragraph>{selectedFunction.details}</Paragraph>

            <Divider orientation="left">语法</Divider>
            <div className="syntax-box">
              <Text code>{selectedFunction.syntax}</Text>
            </div>

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
              />
            ) : (
              <Paragraph>此函数没有参数</Paragraph>
            )}

            <Divider orientation="left">使用示例</Divider>
            <div className="example-box">
              <Text code>{selectedFunction.example}</Text>
            </div>

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

      {/* 公式翻译弹窗 */}
      <Modal
        title="公式验证通过"
        open={translatedFormulaVisible}
        onCancel={() => setTranslatedFormulaVisible(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setTranslatedFormulaVisible(false)}
          >
            确认
          </Button>,
        ]}
      >
        <div style={{ padding: '20px 0' }}>
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
            <CheckCircleOutlined
              style={{ color: '#52c41a', fontSize: '22px', marginRight: '10px' }}
            />
            <Text
              strong
              style={{ fontSize: '16px' }}
            >
              公式格式正确
            </Text>
          </div>

          <Divider />

          <div style={{ marginBottom: '10px' }}>
            <Text type="secondary">原始公式:</Text>
            <div className="formula-code">
              <Text code>{formula}</Text>
            </div>
          </div>

          <div>
            <Text type="secondary">翻译后:</Text>
            <div className="formula-code">
              <Text code>{translatedFormula}</Text>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default FormulaEditor;
