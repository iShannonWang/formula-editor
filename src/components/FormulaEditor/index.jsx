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
  Form,
  InputNumber,
} from 'antd';
import {
  SearchOutlined,
  CodeOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  RightOutlined,
  CalculatorOutlined,
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
import { calculateFormula } from '../../calculateFormula';

const { Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// 获取字段名列表
const getFieldNames = (fields) => fields.map((field) => field.name);

// 创建字段映射对象（中文 -> 英文）
const createFieldNameMapping = (fields) => {
  const mapping = {};
  fields.forEach((field) => {
    mapping[field.name] = field.mapping;
  });
  return mapping;
};

// 创建逆向字段映射对象（英文 -> 中文）
const createReverseFieldNameMapping = (fields) => {
  const mapping = {};
  fields.forEach((field) => {
    mapping[field.mapping] = field.name;
  });
  return mapping;
};

// 公式编辑器组件
const FormulaEditor = ({
  height = '40vh',
  fields,
  fieldTypes,
  fieldTypeConfigs,
  functionGroups,
  functionDefinitions,
}) => {
  // 获取字段名和映射
  const fieldNames = getFieldNames(fields);
  const fieldNameMapping = createFieldNameMapping(fields);
  const reverseFieldNameMapping = createReverseFieldNameMapping(fields);

  // 获取字段类名
  const getFieldClassName = (fieldName) => {
    const field = fields.find((f) => f.name === fieldName);
    if (!field) return 'field-text';

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
      { tag: tags.keyword, color: '#7c4dff', fontWeight: '500' },
      { tag: tags.string, color: '#29b6f6' },
      { tag: tags.number, color: '#ff9100' },
      { tag: tags.function(tags.variableName), color: '#00c853', fontWeight: '500' },
      { tag: tags.operator, color: '#f50057' },
      { tag: tags.comment, color: '#757575', fontStyle: 'italic' },
      { tag: tags.bracket, color: '#546e7a', fontWeight: '500' },
      { tag: tags.className, color: '#ec407a' },
      { tag: tags.variableName, color: '#2196f3', fontWeight: 'bold' },
      { tag: tags.propertyName, color: '#2196f3', fontWeight: 'bold' },
    ]),
  );

  // 状态管理
  const [formula, setFormula] = useState('');
  const [searchFieldTerm, setSearchFieldTerm] = useState('');
  const [searchFuncTerm, setSearchFuncTerm] = useState('');
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [error, setError] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  // 建议相关状态
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  // 验证结果和计算相关状态
  const [validationResult, setValidationResult] = useState(null);
  const [calculationVisible, setCalculationVisible] = useState(false);
  const [calculationVariables, setCalculationVariables] = useState([]);
  const [calculationResult, setCalculationResult] = useState(null);
  const [calculationForm] = Form.useForm();

  // 函数详情弹窗状态
  const [functionDetailVisible, setFunctionDetailVisible] = useState(false);

  // 引用
  const editorRef = useRef(null);
  const cmViewRef = useRef(null);
  const exampleEditorRef = useRef(null);
  const exampleCmViewRef = useRef(null);
  const suggestionsRef = useRef(null);

  // 函数名列表
  const allFunctionNames = Object.keys(functionDefinitions);

  // 自定义CodeMirror配置 - 处理字段和函数高亮
  const createVariableHighlighter = () => {
    const createDecorations = (view) => {
      const decorations = [];
      const text = view.state.doc.toString();

      // 高亮字段名
      for (const fieldName of fieldNames) {
        let startPos = 0;
        while (true) {
          const fieldPos = text.indexOf(fieldName, startPos);
          if (fieldPos === -1) break;

          // 检查前后字符，确保这是一个独立的字段名
          const prevChar = fieldPos > 0 ? text[fieldPos - 1] : '';
          const nextChar =
            fieldPos + fieldName.length < text.length ? text[fieldPos + fieldName.length] : '';

          const isFieldName = !/[a-zA-Z0-9_\]]/.test(prevChar) && !/[a-zA-Z0-9_\[]/.test(nextChar);

          if (isFieldName) {
            const fieldClass = getFieldClassName(fieldName);
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

      // 高亮函数名
      for (const funcName of allFunctionNames) {
        let startPos = 0;
        while (true) {
          const funcPos = text.indexOf(funcName, startPos);
          if (funcPos === -1) break;

          // 检查后一个字符是否为左括号，确保这是一个函数调用
          const nextChar =
            funcPos + funcName.length < text.length ? text[funcPos + funcName.length] : '';

          const isFunctionCall = nextChar === '(';

          if (isFunctionCall) {
            const from = funcPos;
            const to = from + funcName.length;

            decorations.push({
              from,
              to,
              value: Decoration.mark({
                class: 'cm-function',
              }),
            });
          }

          startPos = funcPos + funcName.length;
        }
      }

      return decorations.length ? RangeSet.of(decorations) : RangeSet.empty;
    };

    return ViewPlugin.fromClass(
      class {
        decorations = RangeSet.empty;

        constructor(view) {
          this.decorations = createDecorations(view);
        }

        update(update) {
          if (update.docChanged) {
            this.decorations = createDecorations(update.view);
            setFormula(update.state.doc.toString());
            setError(null);
            setValidationResult(null);
          }
        }
      },
      {
        decorations: (v) => v.decorations,
      },
    );
  };

  // 检查是否应该显示建议
  const checkForSuggestions = (view) => {
    const doc = view.state.doc.toString();
    const cursorPos = view.state.selection.main.head;
    const textBeforeCursor = doc.substring(0, cursorPos);

    // 检查 @ 符号（字段建议）
    if (textBeforeCursor.endsWith('@')) {
      const filteredFields = fields.filter(
        (field) =>
          !searchFieldTerm || field.name.toLowerCase().includes(searchFieldTerm.toLowerCase()),
      );

      setSuggestions(
        filteredFields.map((field) => ({
          id: field.name,
          name: field.name,
          type: field.type,
        })),
      );
      setSuggestionType('field');
      setShowSuggestions(true);

      setTimeout(() => {
        const coords = view.coordsAtPos(cursorPos);
        if (coords) {
          const editorRect = editorRef.current.getBoundingClientRect();
          setCursorPosition({
            x: coords.left - editorRect.left,
            y: coords.bottom - editorRect.top + 5,
          });
        }
      }, 0);

      return true;
    }

    // 检查 # 符号（函数建议）
    if (textBeforeCursor.endsWith('#')) {
      const filteredFunctions = allFunctionNames.filter(
        (func) => !searchFuncTerm || func.toLowerCase().includes(searchFuncTerm.toLowerCase()),
      );

      setSuggestions(
        filteredFunctions.map((func) => ({
          id: func,
          name: func,
          description: functionDefinitions[func]?.description || '',
        })),
      );
      setSuggestionType('function');
      setShowSuggestions(true);

      setTimeout(() => {
        const coords = view.coordsAtPos(cursorPos);
        if (coords) {
          const editorRect = editorRef.current.getBoundingClientRect();
          setCursorPosition({
            x: coords.left - editorRect.left,
            y: coords.bottom - editorRect.top + 5,
          });
        }
      }, 0);

      return true;
    }

    // 检查函数名输入中的自动完成
    const functionMatch = /\b([A-Z]+)$/.exec(textBeforeCursor);
    if (functionMatch) {
      const partialFunc = functionMatch[1];
      const matchingFunctions = allFunctionNames.filter((funcName) =>
        funcName.startsWith(partialFunc),
      );

      if (matchingFunctions.length > 0) {
        setSuggestions(
          matchingFunctions.map((func) => ({
            id: func,
            name: func,
            description: functionDefinitions[func]?.description || '',
          })),
        );
        setSuggestionType('function');
        setShowSuggestions(true);

        setTimeout(() => {
          const coords = view.coordsAtPos(cursorPos);
          if (coords && editorRef.current) {
            const editorRect = editorRef.current.getBoundingClientRect();
            setCursorPosition({
              x: coords.left - editorRect.left,
              y: coords.bottom - editorRect.top + 5,
            });
          }
        }, 0);

        return true;
      }
    }

    setShowSuggestions(false);
    return false;
  };

  // 初始化主编辑器
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
              setValidationResult(null);
              checkForSuggestions(update.view);
            }
          }),
          EditorView.domEventHandlers({
            keydown: (event, view) => {
              if (showSuggestions) {
                if (
                  event.key === 'ArrowDown' ||
                  event.key === 'ArrowUp' ||
                  event.key === 'Enter' ||
                  event.key === 'Escape'
                ) {
                  event.preventDefault();

                  if (event.key === 'Escape') {
                    setShowSuggestions(false);
                  } else if (event.key === 'Enter' && suggestionsRef.current?.selectedIndex >= 0) {
                    const selected = suggestions[suggestionsRef.current.selectedIndex];
                    insertSuggestion(selected);
                  } else {
                    if (!suggestionsRef.current) {
                      suggestionsRef.current = { selectedIndex: 0 };
                    } else {
                      if (event.key === 'ArrowDown') {
                        suggestionsRef.current.selectedIndex =
                          (suggestionsRef.current.selectedIndex + 1) % suggestions.length;
                      } else if (event.key === 'ArrowUp') {
                        suggestionsRef.current.selectedIndex =
                          (suggestionsRef.current.selectedIndex - 1 + suggestions.length) %
                          suggestions.length;
                      }
                    }
                    setSuggestions([...suggestions]);
                  }
                  return true;
                }
              }
              return false;
            },
            click: () => {
              setShowSuggestions(false);
              return false;
            },
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
            '.cm-variableName': {
              color: '#2196f3',
              fontWeight: 'bold',
            },
            '.cm-function': {
              color: '#00c853',
              fontWeight: 'bold',
            },
            '.field-text': {
              color: '#2196f3 !important',
              fontWeight: 'bold !important',
            },
            '.field-number': {
              color: '#2196f3 !important',
              fontWeight: 'bold !important',
            },
            '.field-datetime': {
              color: '#2196f3 !important',
              fontWeight: 'bold !important',
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

  // 初始化示例编辑器
  useEffect(() => {
    if (exampleEditorRef.current && !exampleCmViewRef.current) {
      const updatedExampleFormula = 'ADD(count, age)';

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

  // 插入建议
  const insertSuggestion = (suggestion) => {
    if (cmViewRef.current) {
      const doc = cmViewRef.current.state.doc.toString();
      const cursorPos = cmViewRef.current.state.selection.main.head;
      const textBeforeCursor = doc.substring(0, cursorPos);

      let from, insert;

      if (suggestionType === 'field') {
        // 字段建议（@符号）
        from = textBeforeCursor.lastIndexOf('@');
        if (from !== -1) {
          insert = suggestion.name;
        }
      } else if (suggestionType === 'function') {
        // 函数建议（#符号或自动完成）
        const hashPos = textBeforeCursor.lastIndexOf('#');
        if (hashPos !== -1 && hashPos === cursorPos - 1) {
          from = hashPos;
          insert = suggestion.name + '()';
        } else {
          const funcMatch = /\b([A-Z]+)$/.exec(textBeforeCursor);
          if (funcMatch) {
            from = cursorPos - funcMatch[1].length;
            insert = suggestion.name + '()';
          }
        }
      }

      if (from !== undefined && insert !== undefined) {
        cmViewRef.current.dispatch({
          changes: { from, to: cursorPos, insert },
        });

        // 如果是函数，将光标定位到括号内
        if (suggestionType === 'function') {
          const newCursorPos = from + suggestion.name.length + 1;
          cmViewRef.current.dispatch({
            selection: { anchor: newCursorPos },
          });
        }

        cmViewRef.current.focus();
        setShowSuggestions(false);
        messageApi.success(`已添加: ${suggestion.name}`);
      }
    }
  };

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

  // 插入字段
  const insertField = (fieldName) => {
    if (cmViewRef.current) {
      const pos = cmViewRef.current.state.selection.main.head;
      const doc = cmViewRef.current.state.doc.toString();
      const beforeCursor = doc.substring(0, pos);

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

      cmViewRef.current.dispatch({
        changes: { from: pos, insert: insert },
      });

      cmViewRef.current.focus();
      messageApi.success(`已添加: ${fieldName}`);
    }
  };

  // 插入函数
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

  // 解析并翻译公式（中文 -> 英文）
  const translateFormulaToEnglish = (formula) => {
    let translated = formula;

    Object.keys(fieldNameMapping).forEach((fieldName) => {
      const regex = new RegExp(fieldName, 'g');
      translated = translated.replace(regex, fieldNameMapping[fieldName]);
    });

    return translated;
  };

  // 提取公式中使用的变量
  const extractVariables = (formulaText) => {
    const variables = [];

    // 使用正则表达式匹配所有非函数名的单词（可能是变量）
    const possibleVariables =
      formulaText.match(/\b[a-zA-Z\u4e00-\u9fa5][\w\u4e00-\u9fa5]*\b/g) || [];

    // 排除函数名和关键字
    const functionNames = allFunctionNames.map((name) => name.toUpperCase());
    const keywords = ['TRUE', 'FALSE', 'NULL'];

    // 对每个可能的变量检查它是否是字段
    possibleVariables.forEach((variable) => {
      // 不是函数名且不是关键字
      if (
        !functionNames.includes(variable.toUpperCase()) &&
        !keywords.includes(variable.toUpperCase())
      ) {
        // 检查是否是字段名
        const field = fields.find((f) => f.name === variable);
        if (field && !variables.find((v) => v.name === variable)) {
          variables.push({
            name: variable,
            type: field.type,
            mapping: field.mapping,
          });
        }
      }
    });

    return variables;
  };

  // 验证函数的参数数量
  const validateFunctionParameters = (funcName, params) => {
    const func = functionDefinitions[funcName];
    if (!func) return false;

    // 检查函数定义中的参数信息
    const requiredParams = func.params ? func.params.filter((p) => !p.name.includes('...')) : [];

    // 如果有参数但传入的是空字符串，则参数不足
    if (requiredParams.length > 0 && (!params || params.trim() === '')) {
      return false;
    }

    // 如果函数定义中有可变参数（...）
    const hasVariableParams = func.params ? func.params.some((p) => p.name.includes('...')) : false;

    // 分割参数
    const paramsList = params
      ? params
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p !== '')
      : [];

    // 如果没有可变参数，则参数数量必须匹配
    if (!hasVariableParams && paramsList.length < requiredParams.length) {
      return false;
    }

    return true;
  };

  // 验证公式
  const validateFormula = () => {
    try {
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

      // 验证函数名
      const funcNameMatch = formulaText.match(/^([A-Z]+)\(/);
      if (!funcNameMatch) {
        setError('公式格式错误: 必须以函数名开头');
        messageApi.error('公式格式错误: 必须以函数名开头');
        return false;
      }

      const functionName = funcNameMatch[1];
      if (!functionDefinitions[functionName]) {
        setError(`公式格式错误: 未知函数 "${functionName}"`);
        messageApi.error(`公式格式错误: 未知函数 "${functionName}"`);
        return false;
      }

      // 提取参数
      const parametersText = formulaText.substring(
        formulaText.indexOf('(') + 1,
        formulaText.lastIndexOf(')'),
      );

      // 检查连续的逗号（表示空参数）
      if (parametersText.includes(',,')) {
        setError('公式格式错误: 连续的逗号表示空参数');
        messageApi.error('公式格式错误: 连续的逗号表示空参数');
        return false;
      }

      // 验证函数参数数量
      if (!validateFunctionParameters(functionName, parametersText)) {
        setError(`公式格式错误: 函数 "${functionName}" 的参数数量不正确`);
        messageApi.error(`公式格式错误: 函数 "${functionName}" 的参数数量不正确`);
        return false;
      }

      // 设置验证结果
      const chineseVersion = formulaText;
      const englishVersion = translateFormulaToEnglish(formulaText);

      // 抽取变量并准备表单
      const variables = extractVariables(formula);
      setCalculationVariables(variables);

      // 设置验证结果
      setValidationResult({
        isValid: true,
        chineseVersion,
        englishVersion,
      });

      // 重置表单和计算结果
      calculationForm.resetFields();
      setCalculationResult(null);

      // 显示计算弹窗
      setCalculationVisible(true);

      setError(null);
      return true;
    } catch (err) {
      setError('验证错误: ' + err.message);
      messageApi.error('验证错误: ' + err.message);
      return false;
    }
  };

  // 计算公式结果
  const handleCalculate = (values) => {
    try {
      // 获取英文公式
      const calculationFormula = translateFormulaToEnglish(formula);

      // 创建用于计算的环境
      const scope = {};

      // 将表单值添加到作用域
      calculationVariables.forEach((variable) => {
        const value = values[variable.name];
        scope[variable.mapping] = value;
      });

      // 解析公式结构
      let result;

      // 提取函数名和参数
      const funcMatch = calculationFormula.match(/^([A-Z]+)\((.*)\)$/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const paramsText = funcMatch[2];
        const params = paramsText.split(',').map((p) => p.trim());

        // 替换参数中的字段名为其值
        const paramValues = params.map((param) => {
          // 如果参数是直接的字段名
          if (scope[param] !== undefined) {
            return scope[param];
          }
          // 如果参数是数值常量
          else if (!isNaN(parseFloat(param))) {
            return parseFloat(param);
          }
          // 如果参数是字符串常量
          else if (
            (param.startsWith('"') && param.endsWith('"')) ||
            (param.startsWith("'") && param.endsWith("'"))
          ) {
            return param.substring(1, param.length - 1);
          }
          // 如果参数是复杂表达式
          else {
            try {
              return math.evaluate(param, scope);
            } catch (e) {
              return param; // 如果计算失败，保持原样
            }
          }
        });

        // 根据函数名执行计算
        switch (funcName) {
          case 'ADD':
            result = paramValues.reduce((sum, val) => sum + Number(val), 0);
            break;
          case 'SUBTRACT':
            result = Number(paramValues[0]) - Number(paramValues[1]);
            break;
          case 'MULTIPLY':
            result = paramValues.reduce((product, val) => product * Number(val), 1);
            break;
          case 'DIVIDE':
            if (Number(paramValues[1]) === 0) {
              throw new Error('除数不能为零');
            }
            result = Number(paramValues[0]) / Number(paramValues[1]);
            break;
          case 'SUM':
            result = paramValues.reduce((sum, val) => sum + Number(val), 0);
            break;
          case 'AVERAGE':
            result = paramValues.reduce((sum, val) => sum + Number(val), 0) / paramValues.length;
            break;
          case 'CONCATENATE':
            result = paramValues.join('');
            break;
          case 'IF':
            // 处理IF函数
            let condition;
            try {
              condition = math.evaluate(params[0], scope);
            } catch (e) {
              condition = params[0] === 'true' || params[0] === true;
            }
            result = condition ? paramValues[1] : paramValues[2];
            break;
          default:
            throw new Error(`不支持的函数: ${funcName}`);
        }
      } else {
        // 如果不是函数调用格式，尝试直接计算表达式
        result = math.evaluate(calculationFormula, scope);
      }

      // 设置计算结果
      setCalculationResult({
        formula: formula,
        englishFormula: calculationFormula,
        variables: calculationVariables.map((v) => ({
          name: v.name,
          value: values[v.name],
          mapping: v.mapping,
        })),
        result: result,
      });

      messageApi.success('计算成功');
    } catch (err) {
      messageApi.error('计算错误: ' + err.message);
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

  // 渲染字段列表
  const renderFieldGroups = () => {
    return (
      <div className="fields-container">
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

  // 渲染建议列表
  const renderSuggestionsList = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <div
        className="suggestions-container"
        style={{
          position: 'absolute',
          left: `${cursorPosition.x}px`,
          top: `${cursorPosition.y}px`,
          zIndex: 1000,
          backgroundColor: 'white',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          maxHeight: '200px',
          overflow: 'auto',
          width: '250px',
        }}
      >
        <List
          size="small"
          dataSource={suggestions}
          renderItem={(item, index) => (
            <List.Item
              className={`suggestion-item ${
                suggestionsRef.current?.selectedIndex === index ? 'suggestion-item-selected' : ''
              }`}
              onClick={() => insertSuggestion(item)}
              style={{
                cursor: 'pointer',
                padding: '8px 12px',
                backgroundColor:
                  suggestionsRef.current?.selectedIndex === index ? '#e6f7ff' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>{item.name}</span>
                {suggestionType === 'field' && (
                  <Tag color={getTypeColor(item.type)}>{item.type}</Tag>
                )}
              </div>
              {suggestionType === 'function' && item.description && (
                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                  {item.description}
                </div>
              )}
            </List.Item>
          )}
        />
      </div>
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
        className="formula-editor-layout"
        style={containerStyle}
      >
        <Content
          className="formula-content"
          style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <div className="formula-section">
            <div className="formula-header">
              <div className="formula-label">公式编辑</div>
              <Space>
                <Button
                  type="primary"
                  icon={<CodeOutlined />}
                  onClick={validateFormula}
                >
                  验证公式
                </Button>
              </Space>
            </div>
            <div
              className="editor-wrapper"
              style={{ position: 'relative' }}
            >
              <div
                className="editor-container"
                ref={editorRef}
                style={{ position: 'relative' }}
              ></div>
              {renderSuggestionsList()}
              {error && (
                <div className="error-message">
                  <ExclamationCircleOutlined /> {error}
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                <span style={{ marginRight: '10px' }}>提示：输入 @ 显示字段</span>
                输入 # 显示函数
              </div>
            </div>
          </div>

          {/* 面板布局 - 三等分 */}
          <div className="panels-section">
            <Layout className="panels-layout">
              {/* 左侧字段面板 */}
              <Sider
                width="33.3%"
                className="left-sider"
              >
                <Card
                  title={<Text strong>表单字段</Text>}
                  className="panel-card"
                >
                  <Input
                    placeholder="搜索字段"
                    prefix={<SearchOutlined />}
                    value={searchFieldTerm}
                    onChange={(e) => setSearchFieldTerm(e.target.value)}
                    className="search-input"
                    allowClear
                  />
                  <div className="panel-content">{renderFieldGroups()}</div>
                </Card>
              </Sider>

              {/* 中间函数面板 */}
              <Content
                className="middle-content"
                width="33.3%"
              >
                <Card
                  title={<Text strong>函数列表</Text>}
                  className="panel-card"
                >
                  <Input
                    placeholder="搜索函数"
                    prefix={<SearchOutlined />}
                    value={searchFuncTerm}
                    onChange={(e) => setSearchFuncTerm(e.target.value)}
                    className="search-input"
                    allowClear
                  />
                  <div className="panel-content">
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
                className="right-sider"
              >
                <Card
                  title={<Text strong>函数说明</Text>}
                  className="panel-card"
                >
                  <div className="panel-content">
                    {selectedFunction ? (
                      <div className="function-doc">
                        <Title level={5}>{selectedFunction.name}</Title>
                        <Paragraph>{selectedFunction.description}</Paragraph>
                        <Divider orientation="left">用法</Divider>
                        <div className="syntax-box">{selectedFunction.syntax}</div>
                        <Divider orientation="left">示例</Divider>
                        <div className="example-box">{selectedFunction.example}</div>

                        <Button
                          type="link"
                          icon={<QuestionCircleOutlined />}
                          onClick={showFunctionDetail}
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
        className="function-detail-modal"
      >
        {selectedFunction && (
          <div className="function-detail-content">
            <Paragraph>{selectedFunction.details}</Paragraph>

            <Divider orientation="left">语法</Divider>
            <div className="syntax-box">{selectedFunction.syntax}</div>

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
            <div className="example-box">{selectedFunction.example}</div>

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

      {/* 计算公式弹窗 */}
      <Modal
        title="计算公式结果"
        open={calculationVisible}
        onCancel={() => setCalculationVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ padding: '16px 0' }}>
          {validationResult && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <Title level={5}>中文公式:</Title>
                <div className="formula-code chinese-formula">
                  {validationResult.chineseVersion}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <Title level={5}>英文公式:</Title>
                <div className="formula-code english-formula">
                  {validationResult.englishVersion}
                </div>
              </div>

              {calculateFormula(validationResult.englishVersion, { count: 8 })}

              {calculationVariables.length > 0 ? (
                <>
                  <Divider orientation="left">输入变量值</Divider>

                  <Form
                    form={calculationForm}
                    onFinish={handleCalculate}
                    layout="vertical"
                  >
                    {calculationVariables.map((variable) => (
                      <Form.Item
                        key={variable.name}
                        name={variable.name}
                        label={
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '8px' }}>{variable.name}</span>
                            <Tag color={getTypeColor(variable.type)}>{variable.type}</Tag>
                          </div>
                        }
                        rules={[{ required: true, message: `请输入${variable.name}的值` }]}
                      >
                        {variable.type === fieldTypes.NUMBER ? (
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder={`请输入${variable.name}的值`}
                          />
                        ) : (
                          <Input placeholder={`请输入${variable.name}的值`} />
                        )}
                      </Form.Item>
                    ))}

                    <Form.Item>
                      <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => setCalculationVisible(false)}>取消</Button>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<CalculatorOutlined />}
                        >
                          计算
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>

                  {calculationResult && (
                    <>
                      <Divider orientation="left">计算结果</Divider>

                      <div
                        style={{
                          padding: '16px',
                          backgroundColor: '#f6ffed',
                          border: '1px solid #b7eb8f',
                          borderRadius: '6px',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleOutlined
                            style={{ color: '#52c41a', marginRight: '8px', fontSize: '20px' }}
                          />
                          <Text
                            strong
                            style={{ fontSize: '16px' }}
                          >
                            结果:{' '}
                          </Text>
                          <Text
                            style={{
                              fontSize: '18px',
                              marginLeft: '8px',
                              backgroundColor: '#fff',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              border: '1px solid #d9d9d9',
                            }}
                          >
                            {typeof calculationResult.result === 'number'
                              ? calculationResult.result.toLocaleString()
                              : calculationResult.result}
                          </Text>
                        </div>
                      </div>

                      {/* 显示详细计算信息 */}
                      <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                        <Text strong>计算详情:</Text>
                        <pre
                          style={{
                            marginTop: '8px',
                            padding: '12px',
                            backgroundColor: '#f8f8f8',
                            borderRadius: '4px',
                            overflowX: 'auto',
                          }}
                        >
                          {JSON.stringify(
                            {
                              variables: calculationResult.variables.reduce((acc, v) => {
                                acc[v.mapping] = v.value;
                                return acc;
                              }, {}),
                              formula: calculationResult.englishFormula,
                              result: calculationResult.result,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Empty description="公式中未检测到变量" />
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default FormulaEditor;
