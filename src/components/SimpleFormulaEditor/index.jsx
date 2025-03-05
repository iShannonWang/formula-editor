// SimpleFormulaEditor.jsx
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
import './SimpleFormulaEditor.css';

const { Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// 简化版公式编辑器（无库依赖）
const SimpleFormulaEditor = forwardRef(
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
    const [translationVisible, setTranslationVisible] = useState(false);
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
        if (editorRef.current) {
          editorRef.current.value = newFormula;
          updateHighlight(newFormula);
        }
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
      const possibleVars = formulaText.match(/\b[a-zA-Z\u4e00-\u9fa5][\w\u4e00-\u9fa5]*\b/g) || [];
      const functionNames = allFunctionNames.map((name) => name.toUpperCase());
      const keywords = ['TRUE', 'FALSE', 'NULL'];

      for (const varName of possibleVars) {
        // 排除函数名和关键字
        if (
          !functionNames.includes(varName.toUpperCase()) &&
          !keywords.includes(varName.toUpperCase())
        ) {
          // 检查是否是字段名
          const field = fields.find((f) => f.name === varName);
          if (field && !variables.find((v) => v.name === varName)) {
            variables.push({
              name: varName,
              type: field.type,
              mapping: field.mapping,
            });
          }
        }
      }

      return variables;
    };

    // 增强的验证函数 - 检查参数类型匹配
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

      // 参数提取和检查
      const parametersText = formulaText.substring(
        formulaText.indexOf('(') + 1,
        formulaText.lastIndexOf(')'),
      );

      // 检查连续的逗号（表示空参数）
      if (parametersText.includes(',,')) {
        return {
          isValid: false,
          error: '公式格式错误: 连续的逗号表示空参数',
        };
      }

      // 解析参数
      const params = parametersText
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p !== '');

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

      // 参数类型检查 - 核心改进部分
      if (['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'SUM', 'AVERAGE'].includes(functionName)) {
        // 数值运算函数：参数必须是数值类型的字段或数字常量
        for (let i = 0; i < params.length; i++) {
          const param = params[i];

          // 如果是数字常量，跳过
          if (!isNaN(parseFloat(param)) && isFinite(param)) {
            continue;
          }

          // 如果是字段名，检查类型
          const field = fields.find((f) => f.name === param);
          if (field) {
            if (field.type !== fieldTypes.NUMBER) {
              return {
                isValid: false,
                error: `函数 ${functionName} 的参数必须是数值类型，但提供的是 ${field.type} 类型`,
              };
            }
          } else {
            // 不是字段名也不是数字常量
            return {
              isValid: false,
              error: `函数 ${functionName} 的参数 "${param}" 无法识别，必须是数值字段或数字常量`,
            };
          }
        }
      } else if (functionName === 'CONCATENATE') {
        // 文本连接函数：参数可以是任何类型，会自动转换为文本
        // 无需特别检查
      } else if (['GT', 'LT', 'GTE', 'LTE'].includes(functionName)) {
        // 比较函数：参数类型必须匹配（同为数值或同为文本）
        if (params.length >= 2) {
          const param1 = params[0];
          const param2 = params[1];

          const type1 = getParamType(param1);
          const type2 = getParamType(param2);

          if (type1 && type2 && type1 !== type2) {
            return {
              isValid: false,
              error: `函数 ${functionName} 的参数类型必须匹配，但提供的是 ${type1} 和 ${type2}`,
            };
          }
        }
      }

      return {
        isValid: true,
        functionName,
        parameters: params,
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
          '<span class="highlight-function">$1</span>(',
        );
      });

      // 高亮字段名
      fieldNames.forEach((fieldName) => {
        const fieldType = fieldTypeMapping[fieldName];
        const pattern = new RegExp(`\\b(${fieldName})\\b`, 'g');
        highlightedHtml = highlightedHtml.replace(
          pattern,
          `<span class="highlight-field highlight-${fieldType}">${fieldName}</span>`,
        );
      });

      // 高亮括号和逗号
      highlightedHtml = highlightedHtml
        .replace(/(\(|\))/g, '<span class="highlight-bracket">$1</span>')
        .replace(/,/g, '<span class="highlight-comma">,</span>');

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

    // 插入字段
    const insertField = (fieldName) => {
      if (editorRef.current) {
        const textarea = editorRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
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
        textarea.value = newFormula;
        updateHighlight(newFormula);

        // 更新光标位置
        const newCursorPos = start + insert.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);

        if (onChange) {
          onChange(newFormula);
        }

        messageApi.success(`已添加: ${fieldName}`);
      }
    };

    // 插入函数
    const insertFunction = (funcName) => {
      if (editorRef.current) {
        const fn = functionDefinitions[funcName];
        setSelectedFunction({ ...fn, name: funcName });

        const textarea = editorRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const beforeCursor = formula.substring(0, start);
        const afterCursor = formula.substring(end);

        const insert = funcName + '()';
        const newFormula = beforeCursor + insert + afterCursor;

        setFormula(newFormula);
        textarea.value = newFormula;
        updateHighlight(newFormula);

        // 更新光标位置到括号内
        const newCursorPos = start + funcName.length + 1;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);

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

        // 设置验证结果
        setValidationResult({
          isValid: true,
          originalFormula: formula,
          translatedFormula,
        });

        // 显示翻译弹窗
        setTranslationVisible(true);
        setError(null);
        return true;
      } catch (err) {
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
                    onClick={validateFormulaHandler}
                  >
                    验证公式
                  </Button>
                </Space>
              </div>
              <div
                className="editor-wrapper"
                style={{ position: 'relative' }}
              >
                <div className="editor-container">
                  {/* 高亮层 */}
                  <div
                    className="highlight-layer"
                    ref={highlightLayerRef}
                  ></div>

                  {/* 编辑器 */}
                  <textarea
                    ref={editorRef}
                    className="formula-textarea"
                    value={formula}
                    onChange={handleEditorChange}
                    spellCheck="false"
                  />
                </div>

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
          className="function-detail-modal"
        >
          {selectedFunction && (
            <div className="function-detail-content">
              <Paragraph>{selectedFunction.details || selectedFunction.description}</Paragraph>

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
        <Modal
          title="公式转换结果"
          open={translationVisible}
          onCancel={() => setTranslationVisible(false)}
          footer={[
            <Button
              key="close"
              onClick={() => setTranslationVisible(false)}
            >
              关闭
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

              <div style={{ marginBottom: '16px' }}>
                <Title level={5}>中文公式:</Title>
                <div className="formula-code chinese-formula">
                  {validationResult.originalFormula}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <Title level={5}>英文公式:</Title>
                <div className="formula-code english-formula">
                  {validationResult.translatedFormula}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </>
    );
  },
);

export default SimpleFormulaEditor;
