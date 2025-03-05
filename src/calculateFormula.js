/**
 * 公式解析器与计算器
 * 支持多种函数类型：基础运算、逻辑函数和文本函数
 */

// 解析函数
function parseFormula(formula) {
  let index = 0;

  // 支持的函数列表
  const SUPPORTED_FUNCTIONS = {
    // 基础运算
    'ADD': { minArgs: 1, maxArgs: Infinity },
    'SUBTRACT': { minArgs: 2, maxArgs: 2 },
    'MULTIPLY': { minArgs: 2, maxArgs: Infinity },
    'DIVIDE': { minArgs: 2, maxArgs: 2 },
    'SUM': { minArgs: 1, maxArgs: Infinity },
    'AVERAGE': { minArgs: 1, maxArgs: Infinity },
    // 逻辑函数
    'IF': { minArgs: 3, maxArgs: 3 },
    'AND': { minArgs: 1, maxArgs: Infinity },
    'OR': { minArgs: 1, maxArgs: Infinity },
    'NOT': { minArgs: 1, maxArgs: 1 },
    'ISEMPTY': { minArgs: 1, maxArgs: 1 },
    'EQ': { minArgs: 2, maxArgs: 2 },
    'GT': { minArgs: 2, maxArgs: 2 },
    'LT': { minArgs: 2, maxArgs: 2 },
    'GTE': { minArgs: 2, maxArgs: 2 },
    'LTE': { minArgs: 2, maxArgs: 2 },
    // 文本函数
    'CONCATENATE': { minArgs: 1, maxArgs: Infinity }
  };

  function parseExpression() {
    // 跳过空白字符
    skipWhitespace();

    // 检查是否是函数调用 - 从长到短排序函数名，避免较短的函数名匹配到较长函数名的前缀
    const funcNames = Object.keys(SUPPORTED_FUNCTIONS).sort((a, b) => b.length - a.length);
    for (const funcName of funcNames) {
      if (formula.substring(index, index + funcName.length).toUpperCase() === funcName) {
        // 跳过函数名
        index += funcName.length;
        return parseFunctionArgs(funcName);
      }
    }

    // 检查是否是字符串
    if (formula[index] === '"' || formula[index] === "'") {
      return parseString();
    }
    // 检查是否是布尔值
    else if (formula.substring(index, index + 4).toLowerCase() === 'true') {
      index += 4;
      return { type: 'boolean', value: true };
    }
    else if (formula.substring(index, index + 5).toLowerCase() === 'false') {
      index += 5;
      return { type: 'boolean', value: false };
    }
    // 检查是否是变量
    else if (/[a-zA-Z_]/.test(formula[index])) {
      return parseVariable();
    }
    // 检查是否是数字
    else if (/[0-9.]/.test(formula[index])) {
      return parseNumber();
    }
    // 抛出错误如果遇到意外的字符
    else {
      throw new Error(`意外的字符 "${formula[index]}" 在位置 ${index}`);
    }
  }

  function skipWhitespace() {
    while (index < formula.length && /\s/.test(formula[index])) {
      index++;
    }
  }

  function parseFunctionArgs(funcName) {
    skipWhitespace();

    // 确保有左括号
    if (formula[index] !== '(') {
      throw new Error(`预期是左括号，但在位置 ${index} 发现了 "${formula[index]}"`);
    }
    index++;

    // 解析参数
    const args = [];

    skipWhitespace();

    // 处理空参数列表的情况
    if (formula[index] === ')') {
      index++;

      // 检查参数数量是否合法
      validateArgCount(funcName, args.length);

      return {
        type: 'function',
        name: funcName,
        args
      };
    }

    // 解析第一个参数
    args.push(parseExpression());

    // 解析剩余的参数
    while (true) {
      skipWhitespace();

      if (formula[index] === ')') {
        index++;
        break;
      } else if (formula[index] === ',') {
        index++; // 跳过逗号
        skipWhitespace();
        args.push(parseExpression());
      } else {
        throw new Error(`预期是逗号或右括号，但在位置 ${index} 发现了 "${formula[index]}"`);
      }
    }

    // 检查参数数量是否合法
    validateArgCount(funcName, args.length);

    return {
      type: 'function',
      name: funcName,
      args
    };
  }

  function validateArgCount(funcName, argCount) {
    const { minArgs, maxArgs } = SUPPORTED_FUNCTIONS[funcName];

    if (argCount < minArgs) {
      throw new Error(`函数 ${funcName} 至少需要 ${minArgs} 个参数，但只提供了 ${argCount} 个`);
    }

    if (maxArgs !== Infinity && argCount > maxArgs) {
      throw new Error(`函数 ${funcName} 最多接受 ${maxArgs} 个参数，但提供了 ${argCount} 个`);
    }
  }

  function parseVariable() {
    let varName = '';

    // 收集变量名
    while (index < formula.length && /[a-zA-Z0-9_]/.test(formula[index])) {
      varName += formula[index];
      index++;
    }

    return {
      type: 'variable',
      name: varName
    };
  }

  function parseNumber() {
    let numStr = '';

    // 收集数字（包括小数点）
    while (index < formula.length && /[0-9.]/.test(formula[index])) {
      numStr += formula[index];
      index++;
    }

    // 验证数字的有效性
    const num = parseFloat(numStr);
    if (isNaN(num)) {
      throw new Error(`无效的数字格式 "${numStr}" 在位置 ${index - numStr.length}`);
    }

    return {
      type: 'number',
      value: num
    };
  }

  function parseString() {
    const quoteChar = formula[index];
    index++; // 跳过开始引号

    let str = '';

    // 收集字符串内容
    while (index < formula.length && formula[index] !== quoteChar) {
      // 处理转义字符
      if (formula[index] === '\\' && index + 1 < formula.length) {
        index++;
        if (formula[index] === 'n') str += '\n';
        else if (formula[index] === 't') str += '\t';
        else str += formula[index];
      } else {
        str += formula[index];
      }
      index++;
    }

    // 确保字符串正确闭合
    if (index >= formula.length) {
      throw new Error(`未闭合的字符串，缺少结束引号`);
    }

    index++; // 跳过结束引号

    return {
      type: 'string',
      value: str
    };
  }

  // 开始解析
  const ast = parseExpression();

  // 跳过尾部空白
  skipWhitespace();

  // 确保整个公式都已解析完成
  if (index !== formula.length) {
    throw new Error(`解析结束后仍有额外的字符在位置 ${index}`);
  }

  return ast;
}

// 判断值是否为空
function isEmpty(value) {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0)
  );
}

// 计算函数
function evaluateFormula(ast, variables) {
  // 如果是变量，返回其值
  if (ast.type === 'variable') {
    if (!(ast.name in variables)) {
      throw new Error(`未定义的变量: ${ast.name}`);
    }
    return variables[ast.name];
  }

  // 如果是字面量，直接返回值
  if (ast.type === 'number' || ast.type === 'string' || ast.type === 'boolean') {
    return ast.value;
  }

  // 如果是函数调用
  if (ast.type === 'function') {
    // 计算所有参数的值
    const argValues = ast.args.map(arg => evaluateFormula(arg, variables));

    // 根据函数类型执行相应的操作
    switch (ast.name) {
      // 基础运算函数
      case 'ADD':
        return argValues.reduce((sum, val) => {
          if (typeof val !== 'number') {
            throw new Error(`ADD 函数的参数必须是数字，但接收到了 ${typeof val}`);
          }
          return sum + val;
        }, 0);

      case 'SUBTRACT':
        if (typeof argValues[0] !== 'number' || typeof argValues[1] !== 'number') {
          throw new Error(`SUBTRACT 函数的参数必须是数字`);
        }
        return argValues[0] - argValues[1];

      case 'MULTIPLY':
        return argValues.reduce((product, val) => {
          if (typeof val !== 'number') {
            throw new Error(`MULTIPLY 函数的参数必须是数字，但接收到了 ${typeof val}`);
          }
          return product * val;
        }, 1);

      case 'DIVIDE':
        if (typeof argValues[0] !== 'number' || typeof argValues[1] !== 'number') {
          throw new Error(`DIVIDE 函数的参数必须是数字`);
        }
        if (argValues[1] === 0) {
          throw new Error(`除数不能为零`);
        }
        return argValues[0] / argValues[1];

      case 'SUM':
        return argValues.reduce((sum, val) => {
          if (typeof val !== 'number') {
            throw new Error(`SUM 函数的参数必须是数字，但接收到了 ${typeof val}`);
          }
          return sum + val;
        }, 0);

      case 'AVERAGE':
        if (argValues.length === 0) {
          throw new Error(`AVERAGE 函数至少需要一个参数`);
        }
        const sum = argValues.reduce((sum, val) => {
          if (typeof val !== 'number') {
            throw new Error(`AVERAGE 函数的参数必须是数字，但接收到了 ${typeof val}`);
          }
          return sum + val;
        }, 0);
        return sum / argValues.length;

      // 逻辑函数
      case 'IF':
        // IF(condition, trueValue, falseValue)
        return Boolean(argValues[0]) ? argValues[1] : argValues[2];

      case 'AND':
        // 所有参数必须为 true 才返回 true
        return argValues.every(val => Boolean(val));

      case 'OR':
        // 只要有一个参数为 true 就返回 true
        return argValues.some(val => Boolean(val));

      case 'NOT':
        // 对参数取反
        return !Boolean(argValues[0]);

      case 'ISEMPTY':
        // 判断参数是否为空
        return isEmpty(argValues[0]);

      case 'EQ':
        // 判断两个参数是否相等
        // 使用严格相等，但对于数字和字符串进行特殊处理
        if (typeof argValues[0] === 'number' && typeof argValues[1] === 'string') {
          return argValues[0] == argValues[1]; // 使用宽松相等允许数字字符串比较
        } else if (typeof argValues[0] === 'string' && typeof argValues[1] === 'number') {
          return argValues[0] == argValues[1]; // 使用宽松相等允许数字字符串比较
        } else {
          return argValues[0] === argValues[1]; // 否则使用严格相等
        }

      case 'GT':
        // 判断第一个参数是否大于第二个参数
        if (typeof argValues[0] !== 'number' || typeof argValues[1] !== 'number') {
          throw new Error(`GT 函数的参数必须是数字`);
        }
        return argValues[0] > argValues[1];

      case 'LT':
        // 判断第一个参数是否小于第二个参数
        if (typeof argValues[0] !== 'number' || typeof argValues[1] !== 'number') {
          throw new Error(`LT 函数的参数必须是数字`);
        }
        return argValues[0] < argValues[1];

      case 'GTE':
        // 判断第一个参数是否大于等于第二个参数
        if (typeof argValues[0] !== 'number' || typeof argValues[1] !== 'number') {
          throw new Error(`GTE 函数的参数必须是数字`);
        }
        return argValues[0] >= argValues[1];

      case 'LTE':
        // 判断第一个参数是否小于等于第二个参数
        if (typeof argValues[0] !== 'number' || typeof argValues[1] !== 'number') {
          throw new Error(`LTE 函数的参数必须是数字`);
        }
        return argValues[0] <= argValues[1];

      // 文本函数
      case 'CONCATENATE':
        return argValues.map(val => String(val)).join('');

      default:
        throw new Error(`不支持的函数: ${ast.name}`);
    }
  }

  throw new Error(`未知的AST节点类型: ${ast.type}`);
}

/**
 * 解析并计算任意公式
 * @param {string} formulaStr - 待计算的公式字符串
 * @param {Object} vars - 包含变量值的对象
 * @returns {any} - 计算结果或错误信息
 */
export function calculateFormula(formulaStr, vars) {
  try {
    const ast = parseFormula(formulaStr);
    const result = evaluateFormula(ast, vars);

    return result;
  } catch (error) {
    return `错误: ${error.message}`;
  }
}

/**
 * 详细解析公式并返回完整信息（包括AST和计算结果）
 * @param {string} formulaStr - 待计算的公式字符串
 * @param {Object} vars - 包含变量值的对象
 * @returns {Object} - 包含解析树和计算结果的对象
 */
function analyzeFormula(formulaStr, vars) {
  try {
    const ast = parseFormula(formulaStr);
    const result = evaluateFormula(ast, vars);

    return {
      formula: formulaStr,
      variables: vars,
      ast: ast,
      result: result
    };
  } catch (error) {
    return {
      formula: formulaStr,
      variables: vars,
      error: error.message
    };
  }
}


// 测试用例组
const testCases = [
  // 基础运算测试
  {
    name: '测试 ADD 函数',
    formula: 'ADD(1, 2, 3)',
    vars: {},
    expectedResult: 6
  },
  {
    name: '测试 SUBTRACT 函数',
    formula: 'SUBTRACT(10, 3)',
    vars: {},
    expectedResult: 7
  },
  {
    name: '测试 MULTIPLY 函数',
    formula: 'MULTIPLY(2, 3, 4)',
    vars: {},
    expectedResult: 24
  },
  {
    name: '测试 DIVIDE 函数',
    formula: 'DIVIDE(10, 2)',
    vars: {},
    expectedResult: 5
  },
  {
    name: '测试 SUM 函数',
    formula: 'SUM(1, 2, 3, 4)',
    vars: {},
    expectedResult: 10
  },
  {
    name: '测试 AVERAGE 函数',
    formula: 'AVERAGE(2, 4, 6)',
    vars: {},
    expectedResult: 4
  },

  // 现有逻辑函数测试
  {
    name: '测试 IF 函数 - 条件为真',
    formula: 'IF(true, "真", "假")',
    vars: {},
    expectedResult: '真'
  },
  {
    name: '测试 IF 函数 - 条件为假',
    formula: 'IF(false, "真", "假")',
    vars: {},
    expectedResult: '假'
  },
  {
    name: '测试 IF 函数 - 嵌套使用',
    formula: 'IF(GT(x, 10), "大于10", IF(GT(x, 5), "大于5", "小于等于5"))',
    vars: { x: 7 },
    expectedResult: '大于5'
  },

  // 新增逻辑函数测试
  {
    name: '测试 AND 函数 - 所有为真',
    formula: 'AND(true, true, true)',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 AND 函数 - 部分为假',
    formula: 'AND(true, false, true)',
    vars: {},
    expectedResult: false
  },
  {
    name: '测试 OR 函数 - 部分为真',
    formula: 'OR(false, true, false)',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 OR 函数 - 全部为假',
    formula: 'OR(false, false, false)',
    vars: {},
    expectedResult: false
  },
  {
    name: '测试 NOT 函数 - 取反',
    formula: 'NOT(true)',
    vars: {},
    expectedResult: false
  },
  {
    name: '测试 ISEMPTY 函数 - 空字符串',
    formula: 'ISEMPTY("")',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 ISEMPTY 函数 - 非空字符串',
    formula: 'ISEMPTY("abc")',
    vars: {},
    expectedResult: false
  },
  {
    name: '测试 ISEMPTY 函数 - null',
    formula: 'ISEMPTY(null)',
    vars: { null: null },
    expectedResult: true
  },
  {
    name: '测试 EQ 函数 - 数字相等',
    formula: 'EQ(10, 10)',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 EQ 函数 - 数字与字符串比较',
    formula: 'EQ(10, "10")',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 EQ 函数 - 字符串相等',
    formula: 'EQ("hello", "hello")',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 GT 函数 - 大于',
    formula: 'GT(10, 5)',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 GT 函数 - 不大于',
    formula: 'GT(5, 10)',
    vars: {},
    expectedResult: false
  },
  {
    name: '测试 LT 函数 - 小于',
    formula: 'LT(5, 10)',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 LT 函数 - 不小于',
    formula: 'LT(10, 5)',
    vars: {},
    expectedResult: false
  },
  {
    name: '测试 GTE 函数 - 大于',
    formula: 'GTE(10, 5)',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 GTE 函数 - 等于',
    formula: 'GTE(5, 5)',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 GTE 函数 - 小于',
    formula: 'GTE(3, 5)',
    vars: {},
    expectedResult: false
  },
  {
    name: '测试 LTE 函数 - 小于',
    formula: 'LTE(3, 5)',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 LTE 函数 - 等于',
    formula: 'LTE(5, 5)',
    vars: {},
    expectedResult: true
  },
  {
    name: '测试 LTE 函数 - 大于',
    formula: 'LTE(10, 5)',
    vars: {},
    expectedResult: false
  },

  // 文本函数测试
  {
    name: '测试 CONCATENATE 函数',
    formula: 'CONCATENATE("Hello, ", name, "!")',
    vars: { name: "World" },
    expectedResult: 'Hello, World!'
  },

  // 复杂组合测试
  {
    name: '测试复杂逻辑组合 - 条件判断',
    formula: 'IF(AND(GT(score, 60), LT(score, 85)), "及格", IF(GTE(score, 85), "优秀", "不及格"))',
    vars: { score: 75 },
    expectedResult: '及格'
  },
  {
    name: '测试复杂逻辑组合 - 评分系统',
    formula: 'IF(GTE(score, 90), "A", IF(GTE(score, 80), "B", IF(GTE(score, 70), "C", IF(GTE(score, 60), "D", "F"))))',
    vars: { score: 85 },
    expectedResult: 'B'
  },
  {
    name: '测试变量判空',
    formula: 'IF(ISEMPTY(optionalValue), "未提供", optionalValue)',
    vars: { optionalValue: "" },
    expectedResult: '未提供'
  }
];

// 运行测试
function runTests() {
  console.log('开始测试公式解析器...\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const test of testCases) {
    const result = calculateFormula(test.formula, test.vars);
    const passed = JSON.stringify(result) === JSON.stringify(test.expectedResult);

    if (passed) {
      console.log(`✓ ${test.name} - 通过`);
      passedCount++;
    } else {
      console.log(`✗ ${test.name} - 失败`);
      console.log(`  期望: ${JSON.stringify(test.expectedResult)}`);
      console.log(`  实际: ${JSON.stringify(result)}`);
      failedCount++;
    }
  }

  console.log(`\n测试完成: ${passedCount} 通过, ${failedCount} 失败`);
}

// 执行测试
// runTests();