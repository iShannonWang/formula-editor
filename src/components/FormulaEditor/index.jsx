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
  Dropdown,
} from 'antd';
import {
  SearchOutlined,
  CodeOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import {
  EditorView,
  keymap,
  highlightSpecialChars,
  drawSelection,
  Decoration,
  ViewPlugin,
} from '@codemirror/view';
import { EditorState, RangeSet, StateField, StateEffect } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentOnInput, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { tags } from '@lezer/highlight';
import * as math from 'mathjs';
import './index.css';

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

// 创建逆向字段映射对象(英文到中文)
const createReverseFieldNameMapping = (fields) => {
  const mapping = {};
  fields.forEach((field) => {
    mapping[field.mapping] = field.name;
  });
  return mapping;
};

// 公式编辑器组件
const FormulaEditor = ({
  height = '40vh', // 调整默认高度为40vh，比原来的50vh小
  fields,
  fieldTypes,
  fieldTypeConfigs,
  functionGroups,
  functionDefinitions,
}) => {
  // 从传入的字段列表获取所有字段名和映射
  const fieldNames = getFieldNames(fields);
  const fieldNameMapping = createFieldNameMapping(fields);
  const reverseFieldNameMapping = createReverseFieldNameMapping(fields);

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
      { tag: tags.keyword, color: '#7c4dff', fontWeight: '500' }, // 关键字 - 深紫色
      { tag: tags.string, color: '#29b6f6' }, // 字符串 - 亮蓝色
      { tag: tags.number, color: '#ff9100' }, // 数字 - 橙色
      { tag: tags.function(tags.variableName), color: '#00c853', fontWeight: '500' }, // 函数 - 绿色
      { tag: tags.operator, color: '#f50057' }, // 运算符 - 粉红色
      { tag: tags.comment, color: '#757575', fontStyle: 'italic' }, // 注释 - 灰色
      { tag: tags.bracket, color: '#546e7a', fontWeight: '500' }, // 括号 - 灰蓝色
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

  // 建议状态
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState(''); // 'field' or 'function'
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  // 验证结果状态
  const [validationResult, setValidationResult] = useState(null);

  // 弹窗状态
  const [functionDetailVisible, setFunctionDetailVisible] = useState(false);
  const [translationVisible, setTranslationVisible] = useState(false);

  // CodeMirror 编辑器引用
  const editorRef = useRef(null);
  const cmViewRef = useRef(null);
  const exampleEditorRef = useRef(null);
  const exampleCmViewRef = useRef(null);
  const suggestionsRef = useRef(null);

  // 创建所有函数名的列表
  const allFunctionNames = Object.keys(functionDefinitions);

  // 参考用于定位建议列表的编辑器位置
  const editorPositionRef = useRef(null);

  // 自定义CodeMirror配置 - 添加对变量的识别和字段名高亮
  const createVariableHighlighter = () => {
    // 创建一个装饰器类来高亮字段名
    const createDecorations = (view) => {
      const decorations = [];
      const text = view.state.doc.toString();

      // 更新编辑器位置引用
      if (editorRef.current) {
        editorPositionRef.current = editorRef.current.getBoundingClientRect();
      }

      // 遍历所有字段
      for (const fieldName of fieldNames) {
        let startPos = 0;

        // 查找所有匹配项
        while (true) {
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

      // 增强功能：高亮所有函数名
      for (const funcName of allFunctionNames) {
        let startPos = 0;

        // 查找所有匹配项
        while (true) {
          const funcPos = text.indexOf(funcName, startPos);
          if (funcPos === -1) break;

          // 检查后一个字符是否为左括号，确保这是一个函数调用
          const nextChar =
            funcPos + funcName.length < text.length ? text[funcPos + funcName.length] : '';

          const isFunctionCall = nextChar === '(';

          if (isFunctionCall) {
            // 创建装饰器标记
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

      // 不再需要存储每个位置的坐标信息

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

    // 获取光标前的字符
    const textBeforeCursor = doc.substring(0, cursorPos);

    // 检查最后一个字符是否是 @
    if (textBeforeCursor.endsWith('@')) {
      // 显示字段建议
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

      // 获取准确的光标位置坐标
      setTimeout(() => {
        // 延迟获取位置，确保DOM已经更新
        const coords = view.coordsAtPos(cursorPos);
        if (coords) {
          // 获取编辑器容器的位置
          const editorRect = editorRef.current.getBoundingClientRect();
          setCursorPosition({
            x: coords.left - editorRect.left,
            y: coords.bottom - editorRect.top + 5, // 添加一点偏移以避免遮挡光标
          });
        }
      }, 0);

      return true;
    }

    // 检查是否在输入函数名
    const functionMatch = /\b([A-Z]+)$/.exec(textBeforeCursor);
    if (functionMatch) {
      const partialFunc = functionMatch[1];
      // 过滤匹配的函数
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

        // 获取准确的光标位置坐标
        setTimeout(() => {
          // 延迟获取位置，确保DOM已经更新
          const coords = view.coordsAtPos(cursorPos);
          if (coords && editorRef.current) {
            const editorRect = editorRef.current.getBoundingClientRect();
            setCursorPosition({
              x: coords.left - editorRect.left,
              y: coords.bottom - editorRect.top + 5, // 添加一点偏移以避免遮挡光标
            });
          }
        }, 0);

        return true;
      }
    }

    // 如果不满足任何条件，隐藏建议
    setShowSuggestions(false);
    return false;
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
              setValidationResult(null);

              // 检查是否应该显示建议
              checkForSuggestions(update.view);
            }
          }),
          EditorView.domEventHandlers({
            keydown: (event, view) => {
              if (showSuggestions) {
                // 如果按下了方向键、Enter或Esc，处理建议框导航
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
                    // 插入选中的建议
                    const selected = suggestions[suggestionsRef.current.selectedIndex];
                    insertSuggestion(selected);
                  } else {
                    // 更新选中项
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
                    // 强制更新UI
                    setSuggestions([...suggestions]);
                  }
                  return true;
                }
              }

              return false;
            },
            click: () => {
              // 点击编辑器其他地方时隐藏建议
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
            // 添加变量高亮样式
            '.cm-variableName': {
              color: '#2196f3',
              fontWeight: 'bold',
            },
            // 函数高亮
            '.cm-function': {
              color: '#00c853',
              fontWeight: 'bold',
            },
            // 字段类型高亮
            '.field-text': {
              backgroundColor: '#0050b3 !important',
              color: 'white !important',
              fontWeight: 'bold !important',
              borderRadius: '3px !important',
              padding: '2px 4px !important',
            },
            '.field-number': {
              backgroundColor: '#ad4e00 !important',
              color: 'white !important',
              fontWeight: 'bold !important',
              borderRadius: '3px !important',
              padding: '2px 4px !important',
            },
            '.field-datetime': {
              backgroundColor: '#531dab !important',
              color: 'white !important',
              fontWeight: 'bold !important',
              borderRadius: '3px !important',
              padding: '2px 4px !important',
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
      // 示例公式使用英文字段名
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

  // 插入选中的建议
  const insertSuggestion = (suggestion) => {
    if (cmViewRef.current) {
      const doc = cmViewRef.current.state.doc.toString();
      const cursorPos = cmViewRef.current.state.selection.main.head;
      const textBeforeCursor = doc.substring(0, cursorPos);

      let from, insert;

      if (suggestionType === 'field') {
        // 对于字段，处理 @ 字符之后的插入
        from = textBeforeCursor.lastIndexOf('@');
        if (from !== -1) {
          // 替换 @ 为选中的字段名
          insert = suggestion.name;
        }
      } else if (suggestionType === 'function') {
        // 对于函数，处理部分输入的函数名
        const funcMatch = /\b([A-Z]+)$/.exec(textBeforeCursor);
        if (funcMatch) {
          from = cursorPos - funcMatch[1].length;
          insert = suggestion.name + '()';
        }
      }

      if (from !== undefined && insert !== undefined) {
        cmViewRef.current.dispatch({
          changes: { from, to: cursorPos, insert },
        });

        // 如果插入的是函数，将光标定位到括号内
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

  // 更简单、更可靠的插入字段逻辑
  const insertField = (fieldName) => {
    if (cmViewRef.current) {
      const pos = cmViewRef.current.state.selection.main.head;
      const doc = cmViewRef.current.state.doc.toString();

      // 获取光标前的文本
      const beforeCursor = doc.substring(0, pos);

      // 简化逻辑：查找最后一个未关闭的左括号
      const lastOpenParenPos = beforeCursor.lastIndexOf('(');
      const lastCloseParenPos = beforeCursor.lastIndexOf(')');

      let insert = fieldName;

      // 如果光标在函数括号内
      if (lastOpenParenPos > lastCloseParenPos) {
        // 获取括号后的内容
        const afterParen = beforeCursor.substring(lastOpenParenPos + 1).trim();

        if (afterParen === '') {
          // 括号内是空的，直接插入字段
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

      // 执行插入
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

  // 解析并翻译公式（中文到英文）
  const translateFormulaToEnglish = (formula) => {
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

      // 检查参数
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

      // 验证通过，生成中英文版本
      const chineseVersion = formulaText;
      const englishVersion = translateFormulaToEnglish(formulaText);

      // 设置验证结果
      setValidationResult({
        isValid: true,
        chineseVersion,
        englishVersion,
      });

      // 显示翻译结果弹窗
      setTranslationVisible(true);

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

  // 组件样式，根据传入的高度自适应
  const containerStyle = {
    height: height,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '400px', // 设置最小高度，确保布局正常
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

      {/* 验证结果/翻译弹窗 */}
      <Modal
        title="公式验证结果"
        open={translationVisible}
        onCancel={() => setTranslationVisible(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setTranslationVisible(false)}
          >
            确认
          </Button>,
        ]}
        width={600}
      >
        {validationResult && (
          <div className="translation-result">
            <div className="translation-header">
              <CheckCircleOutlined className="translation-success-icon" />
              <Text
                strong
                style={{ fontSize: '16px' }}
              >
                公式格式正确
              </Text>
            </div>

            <Divider />

            <div style={{ marginBottom: '24px' }}>
              <Title level={5}>中文格式:</Title>
              <div className="formula-code chinese-formula">{validationResult.chineseVersion}</div>
            </div>

            <div>
              <Title level={5}>英文格式:</Title>
              <div className="formula-code english-formula">{validationResult.englishVersion}</div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default FormulaEditor;
