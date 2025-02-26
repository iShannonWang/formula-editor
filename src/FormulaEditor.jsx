// FormulaEditor.jsx
import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { Input, Empty, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import './FormulaEditor.css';

const { TextArea } = Input;

const FormulaEditor = forwardRef(({ initialFormula = '', fieldList = [] }, ref) => {
  const [formulaText, setFormulaText] = useState(initialFormula || '');
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [functionSearch, setFunctionSearch] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [suggestionsType, setSuggestionsType] = useState(null); // 'field' or 'function'
  const [suggestions, setSuggestions] = useState([]);
  const [searchPrefix, setSearchPrefix] = useState('');
  const [searchText, setSearchText] = useState('');
  const formulaInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // 函数分类
  const functionGroups = {
    基本运算: ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE'],
    常用函数: ['SUM', 'AVERAGE', 'MAX', 'MIN', 'COUNT', 'IF', 'AND', 'OR', 'NOT'],
    文本函数: ['CONCATENATE', 'LEFT', 'RIGHT', 'MID', 'LEN', 'LOWER', 'UPPER'],
    日期函数: ['TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY', 'DATE'],
    逻辑比较: ['LT', 'LE', 'GT', 'GE', 'EQ', 'NE'],
  };

  // 所有函数列表
  const allFunctions = useMemo(() => {
    return Object.values(functionGroups).flat();
  }, []);

  // 函数说明信息
  const functionInfo = {
    // 基本运算
    ADD: {
      title: 'ADD (加法)',
      description: '将两个或多个数值相加',
      usage: 'ADD(数字1,数字2,...)',
      example: 'ADD(10,20,30)',
      result: '返回 60',
      color: '#ff9800',
    },
    SUBTRACT: {
      title: 'SUBTRACT (减法)',
      description: '从第一个数中减去第二个数',
      usage: 'SUBTRACT(数字1,数字2)',
      example: 'SUBTRACT(100,30)',
      result: '返回 70',
      color: '#ff9800',
    },
    MULTIPLY: {
      title: 'MULTIPLY (乘法)',
      description: '将两个或多个数值相乘',
      usage: 'MULTIPLY(数字1,数字2,...)',
      example: 'MULTIPLY(5,6)',
      result: '返回 30',
      color: '#ff9800',
    },
    DIVIDE: {
      title: 'DIVIDE (除法)',
      description: '将第一个数除以第二个数',
      usage: 'DIVIDE(数字1,数字2)',
      example: 'DIVIDE(100,5)',
      result: '返回 20',
      color: '#ff9800',
    },
    // 常用函数
    SUM: {
      title: 'SUM (求和)',
      description: '计算多个数值的总和',
      usage: 'SUM(数字1,数字2,...)',
      example: 'SUM(1,2,3,4,5)',
      result: '返回 15',
      color: '#ff9800',
    },
    AVERAGE: {
      title: 'AVERAGE (平均值)',
      description: '计算一组数值的算术平均值',
      usage: 'AVERAGE(数字1,数字2...)',
      example: 'AVERAGE(物理成绩,化学成绩,生物成绩)',
      result: '返回三门课程的平均分',
      color: '#ff9800',
    },
    MAX: {
      title: 'MAX (最大值)',
      description: '返回一组数值中的最大值',
      usage: 'MAX(数字1,数字2,...)',
      example: 'MAX(10,20,30)',
      result: '返回 30',
      color: '#ff9800',
    },
    MIN: {
      title: 'MIN (最小值)',
      description: '返回一组数值中的最小值',
      usage: 'MIN(数字1,数字2,...)',
      example: 'MIN(10,20,30)',
      result: '返回 10',
      color: '#ff9800',
    },
    COUNT: {
      title: 'COUNT (计数)',
      description: '计算参数中数值的个数',
      usage: 'COUNT(值1,值2,...)',
      example: 'COUNT(10,20,"text",30)',
      result: '返回 3 (只计算数值)',
      color: '#ff9800',
    },
    IF: {
      title: 'IF (条件判断)',
      description: '根据条件返回不同的值',
      usage: 'IF(条件,为真返回值,为假返回值)',
      example: 'IF(成绩>=60,"通过","不通过")',
      result: '根据成绩判断是否通过',
      color: '#9c27b0',
    },
    AND: {
      title: 'AND (逻辑与)',
      description: '如果所有参数都为真，则返回TRUE',
      usage: 'AND(逻辑值1,逻辑值2,...)',
      example: 'AND(成绩>=60,出勤率>=0.8)',
      result: '只有当成绩和出勤都达标时返回TRUE',
      color: '#9c27b0',
    },
    OR: {
      title: 'OR (逻辑或)',
      description: '如果任何一个参数为真，则返回TRUE',
      usage: 'OR(逻辑值1,逻辑值2,...)',
      example: 'OR(职称="教授",职称="副教授")',
      result: '当职称为教授或副教授时返回TRUE',
      color: '#9c27b0',
    },
    NOT: {
      title: 'NOT (逻辑非)',
      description: '对逻辑值取反',
      usage: 'NOT(逻辑值)',
      example: 'NOT(成绩<60)',
      result: '当成绩不小于60时返回TRUE',
      color: '#9c27b0',
    },
    // 文本函数
    CONCATENATE: {
      title: 'CONCATENATE (文本连接)',
      description: '连接多个文本字符串',
      usage: 'CONCATENATE(文本1,文本2...)',
      example: 'CONCATENATE("您好，",姓名)',
      result: '返回"您好，张三"',
      color: '#2196f3',
    },
    LEFT: {
      title: 'LEFT (左侧文本)',
      description: '从文本左侧截取指定数量的字符',
      usage: 'LEFT(文本,字符数)',
      example: 'LEFT("abcdef",3)',
      result: '返回 "abc"',
      color: '#2196f3',
    },
    RIGHT: {
      title: 'RIGHT (右侧文本)',
      description: '从文本右侧截取指定数量的字符',
      usage: 'RIGHT(文本,字符数)',
      example: 'RIGHT("abcdef",3)',
      result: '返回 "def"',
      color: '#2196f3',
    },
    MID: {
      title: 'MID (中间文本)',
      description: '从文本中间截取指定数量的字符',
      usage: 'MID(文本,起始位置,字符数)',
      example: 'MID("abcdef",2,3)',
      result: '返回 "bcd"',
      color: '#2196f3',
    },
    LEN: {
      title: 'LEN (文本长度)',
      description: '返回文本的字符数',
      usage: 'LEN(文本)',
      example: 'LEN("Hello")',
      result: '返回 5',
      color: '#2196f3',
    },
    LOWER: {
      title: 'LOWER (小写)',
      description: '将文本转换为小写',
      usage: 'LOWER(文本)',
      example: 'LOWER("HELLO")',
      result: '返回 "hello"',
      color: '#2196f3',
    },
    UPPER: {
      title: 'UPPER (大写)',
      description: '将文本转换为大写',
      usage: 'UPPER(文本)',
      example: 'UPPER("hello")',
      result: '返回 "HELLO"',
      color: '#2196f3',
    },
    // 日期函数
    TODAY: {
      title: 'TODAY (今天)',
      description: '返回当前日期',
      usage: 'TODAY()',
      example: 'TODAY()',
      result: '返回当前日期，如 2025-02-26',
      color: '#4caf50',
    },
    NOW: {
      title: 'NOW (现在)',
      description: '返回当前日期和时间',
      usage: 'NOW()',
      example: 'NOW()',
      result: '返回当前日期和时间，如 2025-02-26 15:30:00',
      color: '#4caf50',
    },
    YEAR: {
      title: 'YEAR (年份)',
      description: '返回日期中的年份',
      usage: 'YEAR(日期)',
      example: 'YEAR(TODAY())',
      result: '返回当前年份，如 2025',
      color: '#4caf50',
    },
    MONTH: {
      title: 'MONTH (月份)',
      description: '返回日期中的月份',
      usage: 'MONTH(日期)',
      example: 'MONTH(TODAY())',
      result: '返回当前月份，如 2',
      color: '#4caf50',
    },
    DAY: {
      title: 'DAY (日)',
      description: '返回日期中的天',
      usage: 'DAY(日期)',
      example: 'DAY(TODAY())',
      result: '返回当前日期中的天，如 26',
      color: '#4caf50',
    },
    DATE: {
      title: 'DATE (日期)',
      description: '根据年、月、日创建日期',
      usage: 'DATE(年,月,日)',
      example: 'DATE(2025,2,26)',
      result: '返回 2025-02-26',
      color: '#4caf50',
    },
    // 逻辑比较
    LT: {
      title: 'LT (小于)',
      description: '小于比较函数',
      usage: 'LT(值1,值2)',
      example: 'LT(5,10)',
      result: '返回 TRUE，因为 5 小于 10',
      color: '#9c27b0',
    },
    LE: {
      title: 'LE (小于等于)',
      description: '小于等于比较函数',
      usage: 'LE(值1,值2)',
      example: 'LE(5,5)',
      result: '返回 TRUE，因为 5 等于 5',
      color: '#9c27b0',
    },
    GT: {
      title: 'GT (大于)',
      description: '大于比较函数',
      usage: 'GT(值1,值2)',
      example: 'GT(10,5)',
      result: '返回 TRUE，因为 10 大于 5',
      color: '#9c27b0',
    },
    GE: {
      title: 'GE (大于等于)',
      description: '大于等于比较函数',
      usage: 'GE(值1,值2)',
      example: 'GE(5,5)',
      result: '返回 TRUE，因为 5 等于 5',
      color: '#9c27b0',
    },
    EQ: {
      title: 'EQ (等于)',
      description: '等于比较函数',
      usage: 'EQ(值1,值2)',
      example: 'EQ(5,5)',
      result: '返回 TRUE，因为 5 等于 5',
      color: '#9c27b0',
    },
    NE: {
      title: 'NE (不等于)',
      description: '不等于比较函数',
      usage: 'NE(值1,值2)',
      example: 'NE(5,10)',
      result: '返回 TRUE，因为 5 不等于 10',
      color: '#9c27b0',
    },
  };

  // 检查公式语法
  const validateFormula = (formula) => {
    if (!formula) {
      setErrorMessage('');
      return true;
    }

    // 简单的语法检查逻辑
    try {
      // 检查括号配对
      let brackets = 0;
      for (let char of formula) {
        if (char === '(') brackets++;
        if (char === ')') brackets--;
        if (brackets < 0) throw new Error('括号不匹配');
      }
      if (brackets !== 0) throw new Error('括号不匹配');

      setErrorMessage('');
      return true;
    } catch (error) {
      setErrorMessage(`语法错误: ${error.message}`);
      return false;
    }
  };

  // 处理公式文本变更
  const handleFormulaChange = (e) => {
    const value = e.target.value;
    setFormulaText(value);
    validateFormula(value);

    // 检查光标位置是否在特殊字符后面
    if (formulaInputRef.current) {
      const input = formulaInputRef.current.resizableTextArea.textArea;
      const position = input.selectionStart;
      setCursorPosition(position);

      // 检查当前光标前的文本中是否有触发字符 @ 或 !
      const textBeforeCursor = value.substring(0, position);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      const lastExclamationIndex = textBeforeCursor.lastIndexOf('!');

      // 检查当前是否正在进行字段搜索（@）
      if (
        lastAtIndex !== -1 &&
        lastAtIndex >
          Math.max(
            textBeforeCursor.lastIndexOf(' '),
            textBeforeCursor.lastIndexOf('('),
            textBeforeCursor.lastIndexOf(','),
            textBeforeCursor.lastIndexOf(')'),
          )
      ) {
        const searchTerm = textBeforeCursor.substring(lastAtIndex + 1);
        setSearchText(searchTerm);
        setSearchPrefix('@');
        setSuggestionsType('field');

        // 过滤字段列表
        const filteredFields = fieldList.filter(
          (field) =>
            field.cnName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            field.enCode.toLowerCase().includes(searchTerm.toLowerCase()),
        );

        setSuggestions(filteredFields);
        setSuggestionsVisible(true);
      }
      // 检查当前是否正在进行函数搜索（!）
      else if (
        lastExclamationIndex !== -1 &&
        lastExclamationIndex >
          Math.max(
            textBeforeCursor.lastIndexOf(' '),
            textBeforeCursor.lastIndexOf('('),
            textBeforeCursor.lastIndexOf(','),
            textBeforeCursor.lastIndexOf(')'),
          )
      ) {
        const searchTerm = textBeforeCursor.substring(lastExclamationIndex + 1);
        setSearchText(searchTerm);
        setSearchPrefix('!');
        setSuggestionsType('function');

        // 过滤函数列表
        const filteredFunctions = allFunctions.filter(
          (func) =>
            func.toLowerCase().includes(searchTerm.toLowerCase()) ||
            functionInfo[func]?.title.toLowerCase().includes(searchTerm.toLowerCase()),
        );

        setSuggestions(filteredFunctions);
        setSuggestionsVisible(true);
      } else {
        setSuggestionsVisible(false);
      }
    }
  };

  // 点击外部关闭建议下拉框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setSuggestionsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 将字段或函数插入到光标位置
  const insertAtCursor = (text) => {
    if (!formulaInputRef.current) return;

    const input = formulaInputRef.current.resizableTextArea.textArea;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;

    const newValue =
      formulaText.substring(0, selectionStart) + text + formulaText.substring(selectionEnd);

    setFormulaText(newValue);

    // 设置新的光标位置
    setTimeout(() => {
      // 在文本插入后更新选中位置
      const newCursorPos = selectionStart + text.length;
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
      setCursorPosition(newCursorPos);
    }, 0);
  };

  // 从建议列表中选择项目
  const handleSuggestionSelect = (item) => {
    if (!formulaInputRef.current) return;

    const input = formulaInputRef.current.resizableTextArea.textArea;
    const cursorPos = input.selectionStart;
    const textBeforeCursor = formulaText.substring(0, cursorPos);

    let startPos;
    if (suggestionsType === 'field') {
      startPos = textBeforeCursor.lastIndexOf('@');
      // 替换 @搜索文本 为选中的字段
      const newText =
        formulaText.substring(0, startPos) + item.enCode + formulaText.substring(cursorPos);
      setFormulaText(newText);

      // 设置新的光标位置
      setTimeout(() => {
        const newPos = startPos + item.enCode.length;
        input.focus();
        input.setSelectionRange(newPos, newPos);
        setCursorPosition(newPos);
      }, 0);
    } else if (suggestionsType === 'function') {
      startPos = textBeforeCursor.lastIndexOf('!');
      // 替换 !搜索文本 为选中的函数并添加括号
      addFunctionToFormula(item, startPos, cursorPos);
    }

    setSuggestionsVisible(false);
  };

  // 添加函数到公式
  const addFunctionToFormula = (funcName, replaceStart = null, replaceEnd = null) => {
    setSelectedFunction(funcName);

    // 函数模板，包括括号和参数占位符
    let template;

    // 根据函数类型准备不同的模板
    switch (funcName) {
      case 'TODAY':
      case 'NOW':
        template = `${funcName}()`; // 无参数函数
        break;
      case 'SUM':
      case 'AVERAGE':
      case 'MAX':
      case 'MIN':
      case 'COUNT':
      case 'ADD':
      case 'MULTIPLY':
        template = `${funcName}()`; // 插入空括号，等待添加参数
        break;
      case 'SUBTRACT':
      case 'DIVIDE':
      case 'LT':
      case 'GT':
      case 'LE':
      case 'GE':
      case 'EQ':
      case 'NE':
        template = `${funcName}(,)`; // 需要两个参数
        break;
      case 'IF':
        template = `${funcName}(,,)`; // 需要三个参数
        break;
      default:
        template = `${funcName}()`; // 默认模板
    }

    if (replaceStart !== null && replaceEnd !== null) {
      // 如果提供了替换位置，则替换文本
      const newText =
        formulaText.substring(0, replaceStart) + template + formulaText.substring(replaceEnd);
      setFormulaText(newText);

      // 设置光标位置在函数括号内
      setTimeout(() => {
        if (formulaInputRef.current) {
          const input = formulaInputRef.current.resizableTextArea.textArea;
          const pos = replaceStart + funcName.length + 1; // 定位到左括号后面
          input.focus();
          input.setSelectionRange(pos, pos);
          setCursorPosition(pos);
        }
      }, 10);
    } else {
      // 否则直接在光标位置插入
      insertAtCursor(template);

      // 在括号内设置光标位置
      setTimeout(() => {
        if (formulaInputRef.current) {
          const input = formulaInputRef.current.resizableTextArea.textArea;
          const pos = formulaText.length + funcName.length + 1; // 定位到左括号后面
          input.focus();
          input.setSelectionRange(pos, pos);
          setCursorPosition(pos);
        }
      }, 10);
    }
  };

  // 找到最近的未闭合括号位置
  const findOpenParenthesisPosition = () => {
    if (!formulaInputRef.current) return -1;

    const input = formulaInputRef.current.resizableTextArea.textArea;
    const curPos = input.selectionStart;
    const textBeforeCursor = formulaText.substring(0, curPos);

    // 从光标位置向前查找最近的未闭合括号
    let openCount = 0;
    let closeCount = 0;
    let lastOpenPos = -1;

    for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
      if (textBeforeCursor[i] === ')') closeCount++;
      if (textBeforeCursor[i] === '(') {
        openCount++;
        if (openCount > closeCount) {
          lastOpenPos = i;
          break;
        }
      }
    }

    return lastOpenPos;
  };

  // 添加字段到公式
  const addFieldToFormula = (field) => {
    const fieldCode = field.enCode || '数值';

    // 检查光标位置是否在函数内
    const openParenPos = findOpenParenthesisPosition();

    if (openParenPos !== -1) {
      // 找到函数的结束括号
      const textAfterOpen = formulaText.substring(openParenPos);
      let closeParenPos = -1;
      let openCount = 1;

      for (let i = 1; i < textAfterOpen.length; i++) {
        if (textAfterOpen[i] === '(') openCount++;
        if (textAfterOpen[i] === ')') {
          openCount--;
          if (openCount === 0) {
            closeParenPos = openParenPos + i;
            break;
          }
        }
      }

      if (closeParenPos !== -1) {
        // 检查函数内是否已有内容
        const funcContent = formulaText.substring(openParenPos + 1, closeParenPos);

        // 准备插入字段
        let newText;
        if (funcContent.trim() === '') {
          // 空函数，直接添加字段
          newText = fieldCode;
        } else {
          // 函数内已有内容，检查最后一个字符
          if (funcContent.trim().endsWith(',')) {
            // 最后是逗号，直接添加字段
            newText = ` ${fieldCode}`;
          } else {
            // 添加逗号和字段
            newText = `, ${fieldCode}`;
          }
        }

        // 将光标定位到要插入的位置
        const insertPos = closeParenPos;
        formulaInputRef.current.resizableTextArea.textArea.focus();
        formulaInputRef.current.resizableTextArea.textArea.setSelectionRange(insertPos, insertPos);

        // 插入字段
        insertAtCursor(newText);
      } else {
        // 没找到结束括号，直接插入字段
        insertAtCursor(fieldCode);
      }
    } else {
      // 不在函数内，直接插入字段
      insertAtCursor(fieldCode);
    }
  };

  // 过滤函数列表
  const filterFunctions = (funcs) => {
    if (!functionSearch) return funcs;
    return funcs.filter(
      (func) =>
        func.toLowerCase().includes(functionSearch.toLowerCase()) ||
        functionInfo[func]?.title.toLowerCase().includes(functionSearch.toLowerCase()) ||
        functionInfo[func]?.description.toLowerCase().includes(functionSearch.toLowerCase()),
    );
  };

  // 过滤字段列表
  const filterFields = (fields) => {
    if (!fieldSearch) return fields;
    return fields.filter(
      (field) =>
        field.cnName.toLowerCase().includes(fieldSearch.toLowerCase()) ||
        field.enCode.toLowerCase().includes(fieldSearch.toLowerCase()),
    );
  };

  // 语法高亮处理
  const getHighlightedText = () => {
    if (!formulaText) return null;

    // 创建一个正则表达式匹配函数和字段
    const functionPattern = new RegExp(`\\b(${allFunctions.join('|')})\\b`, 'g');
    const fieldPattern = new RegExp(`\\b(${fieldList.map((f) => f.enCode).join('|')})\\b`, 'g');

    // 保存每个匹配的位置和类型
    const tokens = [];

    // 匹配函数
    let match;
    while ((match = functionPattern.exec(formulaText)) !== null) {
      tokens.push({
        type: 'function',
        start: match.index,
        end: match.index + match[0].length,
        value: match[0],
        color: functionInfo[match[0]]?.color || '#ff9800',
      });
    }

    // 匹配字段
    while ((match = fieldPattern.exec(formulaText)) !== null) {
      // 检查这个匹配是否已经被标记为函数
      const isFunction = tokens.some(
        (token) =>
          token.type === 'function' &&
          match.index >= token.start &&
          match.index + match[0].length <= token.end,
      );

      if (!isFunction) {
        // 查找字段对应的类型颜色
        const field = fieldList.find((f) => f.enCode === match[0]);
        const color =
          field?.value === 'number' ? '#ff9800' : field?.value === 'date' ? '#4caf50' : '#2196f3';

        tokens.push({
          type: 'field',
          start: match.index,
          end: match.index + match[0].length,
          value: match[0],
          color: color,
        });
      }
    }

    // 按照起始位置排序标记
    tokens.sort((a, b) => a.start - b.start);

    // 准备用于渲染的组件
    const components = [];
    let lastIndex = 0;

    tokens.forEach((token, index) => {
      // 添加未高亮的文本
      if (token.start > lastIndex) {
        components.push(
          <span key={`text-${lastIndex}`}>{formulaText.substring(lastIndex, token.start)}</span>,
        );
      }

      // 添加高亮的标记
      components.push(
        <span
          key={`${token.type}-${token.start}`}
          style={{ color: token.color, fontWeight: 'bold' }}
        >
          {token.value}
        </span>,
      );

      lastIndex = token.end;
    });

    // 添加剩余未高亮的文本
    if (lastIndex < formulaText.length) {
      components.push(<span key={`text-${lastIndex}`}>{formulaText.substring(lastIndex)}</span>);
    }

    return components;
  };

  // 导出方法给父组件
  useImperativeHandle(ref, () => ({
    getData: () => {
      // 返回当前公式配置
      if (!validateFormula(formulaText)) {
        return { isValid: false, error: errorMessage };
      }
      return {
        isValid: true,
        formula: formulaText,
      };
    },
    reset: () => {
      // 重置编辑器状态
      setFormulaText('');
      setSelectedFunction(null);
      setErrorMessage('');
      setFunctionSearch('');
      setFieldSearch('');
    },
  }));

  useEffect(() => {
    if (initialFormula) {
      setFormulaText(initialFormula);
      validateFormula(initialFormula);
    }
  }, [initialFormula]);

  // 渲染函数列表
  const renderFunctionList = () => {
    return (
      <div className="function-container">
        <div className="search-container">
          <Input
            placeholder="搜索函数"
            prefix={<SearchOutlined />}
            value={functionSearch}
            onChange={(e) => setFunctionSearch(e.target.value)}
            allowClear
          />
        </div>

        <div className="functions-list">
          {Object.entries(functionGroups).map(([groupName, functions]) => {
            const filteredFunctions = filterFunctions(functions);
            if (filteredFunctions.length === 0) return null;

            return (
              <div
                key={groupName}
                className="function-group"
              >
                <div className="group-name">{groupName}</div>
                {filteredFunctions.map((func, idx) => (
                  // <Tooltip
                  //   key={idx}
                  //   title={functionInfo[func]?.description}
                  //   placement="right"
                  // >
                  <div
                    className={`function-item ${selectedFunction === func ? 'selected' : ''}`}
                    onClick={() => addFunctionToFormula(func)}
                  >
                    <span className="function-name">{functionInfo[func]?.title || func}</span>
                    <span
                      className={`function-type ${
                        func.startsWith('CONCAT') ||
                        ['LEFT', 'RIGHT', 'MID', 'LEN', 'LOWER', 'UPPER'].includes(func)
                          ? 'text-type'
                          : ['IF', 'AND', 'OR', 'NOT', 'LT', 'LE', 'GT', 'GE', 'EQ', 'NE'].includes(
                              func,
                            )
                          ? 'logic-type'
                          : ['TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY', 'DATE'].includes(func)
                          ? 'date-type'
                          : 'number-type'
                      }`}
                    >
                      {func.startsWith('CONCAT') ||
                      ['LEFT', 'RIGHT', 'MID', 'LEN', 'LOWER', 'UPPER'].includes(func)
                        ? '文本'
                        : ['IF', 'AND', 'OR', 'NOT', 'LT', 'LE', 'GT', 'GE', 'EQ', 'NE'].includes(
                            func,
                          )
                        ? '逻辑'
                        : ['TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY', 'DATE'].includes(func)
                        ? '日期'
                        : '数字'}
                    </span>
                  </div>
                  // </Tooltip>
                ))}
              </div>
            );
          })}

          {functionSearch &&
            !Object.values(functionGroups)
              .flat()
              .some((func) => filterFunctions([func]).length > 0) && (
              <Empty description="未找到匹配的函数" />
            )}
        </div>
      </div>
    );
  };

  // 渲染字段列表
  const renderFieldList = () => {
    const filteredFields = filterFields(fieldList);

    return (
      <div className="field-container">
        <div className="search-container">
          <Input
            placeholder="搜索字段"
            prefix={<SearchOutlined />}
            value={fieldSearch}
            onChange={(e) => setFieldSearch(e.target.value)}
            allowClear
          />
        </div>

        <div className="fields-list">
          {filteredFields.length > 0 ? (
            filteredFields.map((field, index) => (
              <div
                key={index}
                className="field-item"
                onClick={() => addFieldToFormula(field)}
              >
                <span className="field-name">{field.cnName}</span>
                <span className="field-code">({field.enCode})</span>
                <span
                  className={`field-type ${
                    field.value === 'number'
                      ? 'number-type'
                      : field.value === 'date'
                      ? 'date-type'
                      : 'text-type'
                  }`}
                >
                  {field.value === 'number' ? '数字' : field.value === 'date' ? '日期' : '文本'}
                </span>
              </div>
            ))
          ) : (
            <Empty description="未找到匹配的字段" />
          )}
        </div>
      </div>
    );
  };

  // 渲染建议列表
  const renderSuggestions = () => {
    if (!suggestionsVisible || suggestions.length === 0) return null;

    return (
      <div
        ref={suggestionsRef}
        className="suggestions-dropdown"
        style={{
          position: 'absolute',
          zIndex: 1000,
          backgroundColor: '#fff',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          width: '300px',
          maxHeight: '250px',
          overflowY: 'auto',
        }}
      >
        {suggestions.length > 0 ? (
          suggestionsType === 'field' ? (
            // 字段建议列表
            suggestions.map((field, index) => (
              <div
                key={index}
                className="suggestion-item"
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: index === suggestions.length - 1 ? 'none' : '1px solid #f0f0f0',
                  alignItems: 'center',
                }}
                onClick={() => handleSuggestionSelect(field)}
              >
                <div>
                  <span style={{ fontWeight: 'bold' }}>{field.cnName}</span>
                  <span style={{ marginLeft: '8px', color: '#8c8c8c' }}>({field.enCode})</span>
                </div>
                <span
                  className={`field-type ${
                    field.value === 'number'
                      ? 'number-type'
                      : field.value === 'date'
                      ? 'date-type'
                      : 'text-type'
                  }`}
                  style={{
                    fontSize: '12px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    color: '#fff',
                  }}
                >
                  {field.value === 'number' ? '数字' : field.value === 'date' ? '日期' : '文本'}
                </span>
              </div>
            ))
          ) : (
            // 函数建议列表
            suggestions.map((func, index) => (
              <div
                key={index}
                className="suggestion-item"
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: index === suggestions.length - 1 ? 'none' : '1px solid #f0f0f0',
                  alignItems: 'center',
                }}
                onClick={() => handleSuggestionSelect(func)}
              >
                <div>
                  <span style={{ fontWeight: 'bold' }}>{functionInfo[func]?.title || func}</span>
                </div>
                <span
                  className={`function-type ${
                    func.startsWith('CONCAT') ||
                    ['LEFT', 'RIGHT', 'MID', 'LEN', 'LOWER', 'UPPER'].includes(func)
                      ? 'text-type'
                      : ['IF', 'AND', 'OR', 'NOT', 'LT', 'LE', 'GT', 'GE', 'EQ', 'NE'].includes(
                          func,
                        )
                      ? 'logic-type'
                      : ['TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY', 'DATE'].includes(func)
                      ? 'date-type'
                      : 'number-type'
                  }`}
                  style={{
                    fontSize: '12px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    color: '#fff',
                  }}
                >
                  {func.startsWith('CONCAT') ||
                  ['LEFT', 'RIGHT', 'MID', 'LEN', 'LOWER', 'UPPER'].includes(func)
                    ? '文本'
                    : ['IF', 'AND', 'OR', 'NOT', 'LT', 'LE', 'GT', 'GE', 'EQ', 'NE'].includes(func)
                    ? '逻辑'
                    : ['TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY', 'DATE'].includes(func)
                    ? '日期'
                    : '数字'}
                </span>
              </div>
            ))
          )
        ) : (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            未找到匹配的{suggestionsType === 'field' ? '字段' : '函数'}
          </div>
        )}
      </div>
    );
  };

  // 用于保存实际文本框的内容，同时支持语法高亮显示
  const renderEditorWithHighlighting = () => {
    return (
      <div
        className="highlighted-editor-container"
        style={{ position: 'relative' }}
      >
        {/* 真实文本输入区域 */}
        <TextArea
          ref={formulaInputRef}
          className={`formula-textarea ${errorMessage ? 'has-error' : ''}`}
          value={formulaText}
          onChange={handleFormulaChange}
          onClick={(e) => setCursorPosition(e.target.selectionStart)}
          placeholder="在此输入或构建公式... 提示：使用@查找字段，使用!查找函数"
          autoSize={{ minRows: 3, maxRows: 6 }}
          style={{
            fontFamily: 'monospace',
            fontSize: '14px',
            background: 'transparent',
            zIndex: 1,
            position: 'relative',
          }}
        />

        {/* 高亮显示区域 - 显示但不可编辑 */}
        <div
          className="syntax-highlight"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            fontFamily: 'monospace',
            fontSize: '14px',
            padding: '4px 11px',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflow: 'auto',
            visibility: formulaText ? 'visible' : 'hidden',
          }}
        >
          {getHighlightedText()}
        </div>

        {/* 显示建议列表 */}
        {renderSuggestions()}
      </div>
    );
  };

  return (
    <div className="formula-editor">
      {/* 公式编辑区域 */}
      <div className="formula-input-container">
        <div className="formula-label">公式 =</div>
        {renderEditorWithHighlighting()}
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        <div
          className="editor-tips"
          style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}
        >
          提示：输入 @ 后可快速查找字段，输入 ! 后可快速查找函数
        </div>
      </div>

      {/* 函数和字段选择区域 */}
      <div className="formula-panels">
        {/* 左侧：函数列表和函数说明 */}
        <div className="formula-panel functions-panel">
          <div className="panel-header">函数</div>
          <div className="panel-body function-panel-body">
            <div className="function-list-container">{renderFunctionList()}</div>

            {/* 函数说明区域（在函数列表右侧显示） */}
            <div className="function-info-container">
              {selectedFunction ? (
                <div className="function-info">
                  <h3>{functionInfo[selectedFunction]?.title || selectedFunction}</h3>
                  <p className="function-desc">{functionInfo[selectedFunction]?.description}</p>
                  <p className="function-usage">用法: {functionInfo[selectedFunction]?.usage}</p>
                  <p className="function-example">
                    示例: {functionInfo[selectedFunction]?.example}
                  </p>
                  <p className="function-result">{functionInfo[selectedFunction]?.result}</p>
                </div>
              ) : (
                <div className="function-info empty-info">
                  <p>请从左侧选择一个函数以查看详细说明</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：字段列表 */}
        <div className="formula-panel fields-panel">
          <div className="panel-header">字段</div>
          <div className="panel-body">{renderFieldList()}</div>
        </div>
      </div>
    </div>
  );
});

export default FormulaEditor;
