// react-formula-editor.js
// 实现公式编辑器的核心功能

// 辅助函数：解析函数参数（考虑嵌套函数情况）
const parseArguments = (content) => {
  let params = [];
  let bracketCount = 0;
  let currentParam = '';

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '(') bracketCount++;
    if (char === ')') bracketCount--;

    if (char === ',' && bracketCount === 0) {
      params.push(currentParam.trim());
      currentParam = '';
    } else {
      currentParam += char;
    }
  }

  // 添加最后一个参数
  params.push(currentParam.trim());

  return params;
};

// 验证公式语法
export const validateFormula = (formula) => {
  if (!formula || formula.trim() === '') {
    return { valid: false, error: '公式不能为空' };
  }

  try {
    // 检查括号匹配
    let brackets = 0;
    for (let i = 0; i < formula.length; i++) {
      if (formula[i] === '(') brackets++;
      else if (formula[i] === ')') brackets--;

      if (brackets < 0) {
        return { valid: false, error: '括号不匹配，右括号过多' };
      }
    }

    if (brackets > 0) {
      return { valid: false, error: '括号不匹配，左括号过多' };
    }

    // 检查函数是否存在
    const functionRegex = /([A-Z][A-Z0-9_]*)\(/g;
    let match;

    while ((match = functionRegex.exec(formula)) !== null) {
      const funcName = match[1];
      // 这里可以添加对特定函数的检查
      // 例如: if (!validFunctions.includes(funcName)) {...}
    }

    // 简单检查是否包含空函数调用
    if (formula.includes('()')) {
      return { valid: false, error: '函数参数不能为空' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// 从公式中提取变量
export const extractVariables = (formula, availableFields = []) => {
  if (!formula) return [];

  try {
    // 创建一个正则表达式匹配所有可能的字段名
    const fieldPattern = availableFields.length > 0 ? availableFields.join('|') : '[a-zA-Z][a-zA-Z0-9_]*';
    const regex = new RegExp(`\\b(${fieldPattern})\\b`, 'g');

    // 收集所有匹配的变量
    const variables = new Set();
    let match;

    // 忽略函数名称
    const functionNames = [
      'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE',
      'SUM', 'AVERAGE', 'MAX', 'MIN', 'COUNT',
      'IF', 'AND', 'OR', 'NOT',
      'CONCATENATE', 'LEFT', 'RIGHT', 'MID', 'LEN', 'LOWER', 'UPPER',
      'TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY', 'DATE',
      'LT', 'LE', 'GT', 'GE', 'EQ', 'NE'
    ];

    // 匹配变量并过滤掉函数名
    while ((match = regex.exec(formula)) !== null) {
      const varName = match[1];
      if (!functionNames.includes(varName.toUpperCase())) {
        variables.add(varName);
      }
    }

    return Array.from(variables);
  } catch (error) {
    console.error('提取变量错误:', error);
    return [];
  }
};

// 执行公式计算
export const calculate = (options) => {
  const { text, variables = {} } = options;

  // 如果没有公式文本，返回空字符串
  if (!text || text.trim() === '') {
    return '';
  }

  // 替换变量
  let processedFormula = text;
  Object.entries(variables).forEach(([key, value]) => {
    // 使用正则表达式替换变量，确保它是一个完整的单词
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    processedFormula = processedFormula.replace(regex, value);
  });

  try {
    // 处理基本算术运算
    if (processedFormula.toUpperCase().startsWith('ADD(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(4, processedFormula.length - 1);

      // 处理嵌套函数的情况 - 按照括号层级拆分参数
      let params = [];
      let bracketCount = 0;
      let currentParam = '';

      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '(') bracketCount++;
        if (char === ')') bracketCount--;

        if (char === ',' && bracketCount === 0) {
          params.push(currentParam.trim());
          currentParam = '';
        } else {
          currentParam += char;
        }
      }
      params.push(currentParam.trim());

      // 递归计算每个参数
      const numbers = params.map(param => {
        const val = calculate({ text: param, variables });
        return typeof val === 'number' ? val : parseFloat(val) || 0;
      });

      return numbers.reduce((sum, num) => sum + num, 0);
    }

    if (processedFormula.toUpperCase().startsWith('SUBTRACT(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(9, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 2) throw new Error('SUBTRACT函数需要两个参数');

      const val1 = calculate({ text: parts[0].trim(), variables });
      const val2 = calculate({ text: parts[1].trim(), variables });

      return (typeof val1 === 'number' ? val1 : parseFloat(val1) || 0) -
        (typeof val2 === 'number' ? val2 : parseFloat(val2) || 0);
    }

    if (processedFormula.toUpperCase().startsWith('MULTIPLY(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(9, processedFormula.length - 1);

      // 处理嵌套函数的情况 - 按照括号层级拆分参数
      let params = [];
      let bracketCount = 0;
      let currentParam = '';

      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '(') bracketCount++;
        if (char === ')') bracketCount--;

        if (char === ',' && bracketCount === 0) {
          params.push(currentParam.trim());
          currentParam = '';
        } else {
          currentParam += char;
        }
      }
      params.push(currentParam.trim());

      // 递归计算每个参数
      const numbers = params.map(param => {
        const val = calculate({ text: param, variables });
        return typeof val === 'number' ? val : parseFloat(val) || 1; // 默认为1避免全部变成0
      });

      return numbers.reduce((product, num) => product * num, 1);
    }

    if (processedFormula.toUpperCase().startsWith('DIVIDE(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(7, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 2) throw new Error('DIVIDE函数需要两个参数');

      const val1 = calculate({ text: parts[0].trim(), variables });
      const val2 = calculate({ text: parts[1].trim(), variables });

      const divisor = typeof val2 === 'number' ? val2 : parseFloat(val2) || 0;
      if (divisor === 0) throw new Error('除数不能为零');

      return (typeof val1 === 'number' ? val1 : parseFloat(val1) || 0) / divisor;
    }

    // 处理 SUM 函数
    if (processedFormula.toUpperCase().startsWith('SUM(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(4, processedFormula.length - 1);
      if (!content.trim()) return 0;

      const params = parseArguments(content);
      const numbers = params.map(param => {
        const val = calculate({ text: param, variables });
        return typeof val === 'number' ? val : parseFloat(val) || 0;
      });

      return numbers.reduce((sum, num) => sum + num, 0);
    }

    // 处理 AVERAGE 函数
    if (processedFormula.toUpperCase().startsWith('AVERAGE(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(8, processedFormula.length - 1);
      if (!content.trim()) return 0;

      const params = parseArguments(content);
      const numbers = params.map(param => {
        const val = calculate({ text: param, variables });
        return typeof val === 'number' ? val : parseFloat(val);
      });

      const validNumbers = numbers.filter(num => !isNaN(num));
      if (validNumbers.length === 0) return 0;

      const sum = validNumbers.reduce((acc, num) => acc + num, 0);
      return sum / validNumbers.length;
    }

    // 处理 MAX 函数
    if (processedFormula.toUpperCase().startsWith('MAX(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(4, processedFormula.length - 1);
      if (!content.trim()) return null;

      const numbers = content.split(',').map(item => {
        const val = calculate({ text: item.trim(), variables });
        return typeof val === 'number' ? val : parseFloat(val);
      });
      const validNumbers = numbers.filter(num => !isNaN(num));
      if (validNumbers.length === 0) return null;

      return Math.max(...validNumbers);
    }

    // 处理 MIN 函数
    if (processedFormula.toUpperCase().startsWith('MIN(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(4, processedFormula.length - 1);
      if (!content.trim()) return null;

      const numbers = content.split(',').map(item => {
        const val = calculate({ text: item.trim(), variables });
        return typeof val === 'number' ? val : parseFloat(val);
      });
      const validNumbers = numbers.filter(num => !isNaN(num));
      if (validNumbers.length === 0) return null;

      return Math.min(...validNumbers);
    }

    // 处理 COUNT 函数
    if (processedFormula.toUpperCase().startsWith('COUNT(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(6, processedFormula.length - 1);
      if (!content.trim()) return 0;

      const values = content.split(',').map(item => {
        const val = calculate({ text: item.trim(), variables });
        return val;
      });
      // 只计数数值型数据
      return values.filter(val => typeof val === 'number' || !isNaN(parseFloat(val))).length;
    }

    // 处理比较函数
    // LT (小于)
    if (processedFormula.toUpperCase().startsWith('LT(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(3, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 2) throw new Error('LT函数需要两个参数');

      const val1 = calculate({ text: parts[0].trim(), variables });
      const val2 = calculate({ text: parts[1].trim(), variables });

      return (typeof val1 === 'number' ? val1 : parseFloat(val1)) <
        (typeof val2 === 'number' ? val2 : parseFloat(val2));
    }

    // LE (小于等于)
    if (processedFormula.toUpperCase().startsWith('LE(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(3, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 2) throw new Error('LE函数需要两个参数');

      const val1 = calculate({ text: parts[0].trim(), variables });
      const val2 = calculate({ text: parts[1].trim(), variables });

      return (typeof val1 === 'number' ? val1 : parseFloat(val1)) <=
        (typeof val2 === 'number' ? val2 : parseFloat(val2));
    }

    // GT (大于)
    if (processedFormula.toUpperCase().startsWith('GT(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(3, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 2) throw new Error('GT函数需要两个参数');

      const val1 = calculate({ text: parts[0].trim(), variables });
      const val2 = calculate({ text: parts[1].trim(), variables });

      return (typeof val1 === 'number' ? val1 : parseFloat(val1)) >
        (typeof val2 === 'number' ? val2 : parseFloat(val2));
    }

    // GE (大于等于)
    if (processedFormula.toUpperCase().startsWith('GE(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(3, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 2) throw new Error('GE函数需要两个参数');

      const val1 = calculate({ text: parts[0].trim(), variables });
      const val2 = calculate({ text: parts[1].trim(), variables });

      return (typeof val1 === 'number' ? val1 : parseFloat(val1)) >=
        (typeof val2 === 'number' ? val2 : parseFloat(val2));
    }

    // EQ (等于)
    if (processedFormula.toUpperCase().startsWith('EQ(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(3, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 2) throw new Error('EQ函数需要两个参数');

      const val1 = calculate({ text: parts[0].trim(), variables });
      const val2 = calculate({ text: parts[1].trim(), variables });

      return val1 == val2; // 使用宽松比较
    }

    // NE (不等于)
    if (processedFormula.toUpperCase().startsWith('NE(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(3, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 2) throw new Error('NE函数需要两个参数');

      const val1 = calculate({ text: parts[0].trim(), variables });
      const val2 = calculate({ text: parts[1].trim(), variables });

      return val1 != val2; // 使用宽松比较
    }

    // 处理 IF 函数
    if (processedFormula.toUpperCase().startsWith('IF(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(3, processedFormula.length - 1);
      // 分割参数，处理嵌套逗号的情况
      let parts = [];
      let bracketCount = 0;
      let currentPart = '';

      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '(') bracketCount++;
        if (char === ')') bracketCount--;

        if (char === ',' && bracketCount === 0) {
          parts.push(currentPart);
          currentPart = '';
        } else {
          currentPart += char;
        }
      }
      parts.push(currentPart);

      if (parts.length !== 3) throw new Error('IF函数需要三个参数');

      const condition = calculate({ text: parts[0].trim(), variables });
      // 根据条件选择返回值
      return condition ?
        calculate({ text: parts[1].trim(), variables }) :
        calculate({ text: parts[2].trim(), variables });
    }

    // 处理 AND 函数
    if (processedFormula.toUpperCase().startsWith('AND(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(4, processedFormula.length - 1);
      if (!content.trim()) return true;

      const conditions = content.split(',').map(item => {
        const val = calculate({ text: item.trim(), variables });
        return !!val; // 转换为布尔值
      });

      return conditions.every(condition => condition === true);
    }

    // 处理 OR 函数
    if (processedFormula.toUpperCase().startsWith('OR(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(3, processedFormula.length - 1);
      if (!content.trim()) return false;

      const conditions = content.split(',').map(item => {
        const val = calculate({ text: item.trim(), variables });
        return !!val; // 转换为布尔值
      });

      return conditions.some(condition => condition === true);
    }

    // 处理 NOT 函数
    if (processedFormula.toUpperCase().startsWith('NOT(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(4, processedFormula.length - 1);
      if (!content.trim()) throw new Error('NOT函数需要一个参数');

      const condition = calculate({ text: content.trim(), variables });
      return !condition;
    }

    // 处理 CONCATENATE 函数
    if (processedFormula.toUpperCase().startsWith('CONCATENATE(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(11, processedFormula.length - 1);
      if (!content.trim()) return '';

      const parts = content.split(',').map(item => {
        const val = calculate({ text: item.trim(), variables });
        return val !== undefined && val !== null ? String(val) : '';
      });

      return parts.join('');
    }

    // 处理文本函数
    // LEFT
    if (processedFormula.toUpperCase().startsWith('LEFT(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(5, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 2) throw new Error('LEFT函数需要两个参数');

      const str = String(calculate({ text: parts[0].trim(), variables }) || '');
      const count = parseInt(calculate({ text: parts[1].trim(), variables }) || 0);

      return str.substring(0, count);
    }

    // RIGHT
    if (processedFormula.toUpperCase().startsWith('RIGHT(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(6, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 2) throw new Error('RIGHT函数需要两个参数');

      const str = String(calculate({ text: parts[0].trim(), variables }) || '');
      const count = parseInt(calculate({ text: parts[1].trim(), variables }) || 0);

      return str.substring(str.length - count);
    }

    // MID
    if (processedFormula.toUpperCase().startsWith('MID(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(4, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 3) throw new Error('MID函数需要三个参数');

      const str = String(calculate({ text: parts[0].trim(), variables }) || '');
      const start = parseInt(calculate({ text: parts[1].trim(), variables }) || 0);
      const count = parseInt(calculate({ text: parts[2].trim(), variables }) || 0);

      return str.substring(start - 1, start - 1 + count);
    }

    // LEN
    if (processedFormula.toUpperCase().startsWith('LEN(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(4, processedFormula.length - 1);
      if (!content.trim()) throw new Error('LEN函数需要一个参数');

      const str = String(calculate({ text: content.trim(), variables }) || '');
      return str.length;
    }

    // LOWER
    if (processedFormula.toUpperCase().startsWith('LOWER(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(6, processedFormula.length - 1);
      if (!content.trim()) throw new Error('LOWER函数需要一个参数');

      const str = String(calculate({ text: content.trim(), variables }) || '');
      return str.toLowerCase();
    }

    // UPPER
    if (processedFormula.toUpperCase().startsWith('UPPER(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(6, processedFormula.length - 1);
      if (!content.trim()) throw new Error('UPPER函数需要一个参数');

      const str = String(calculate({ text: content.trim(), variables }) || '');
      return str.toUpperCase();
    }

    // 处理日期函数
    // TODAY
    if (processedFormula.toUpperCase().startsWith('TODAY(') && processedFormula.endsWith(')')) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    // NOW
    if (processedFormula.toUpperCase().startsWith('NOW(') && processedFormula.endsWith(')')) {
      const now = new Date();
      return now.toISOString().replace('T', ' ').substring(0, 19);
    }

    // YEAR
    if (processedFormula.toUpperCase().startsWith('YEAR(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(5, processedFormula.length - 1);
      if (!content.trim()) throw new Error('YEAR函数需要一个日期参数');

      // 处理日期参数
      const dateStr = calculate({ text: content.trim(), variables });
      const date = new Date(dateStr);

      if (isNaN(date.getTime())) throw new Error('YEAR函数参数不是有效日期');
      return date.getFullYear();
    }

    // MONTH
    if (processedFormula.toUpperCase().startsWith('MONTH(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(6, processedFormula.length - 1);
      if (!content.trim()) throw new Error('MONTH函数需要一个日期参数');

      // 处理日期参数
      const dateStr = calculate({ text: content.trim(), variables });
      const date = new Date(dateStr);

      if (isNaN(date.getTime())) throw new Error('MONTH函数参数不是有效日期');
      return date.getMonth() + 1; // JavaScript 月份从 0 开始
    }

    // DAY
    if (processedFormula.toUpperCase().startsWith('DAY(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(4, processedFormula.length - 1);
      if (!content.trim()) throw new Error('DAY函数需要一个日期参数');

      // 处理日期参数
      const dateStr = calculate({ text: content.trim(), variables });
      const date = new Date(dateStr);

      if (isNaN(date.getTime())) throw new Error('DAY函数参数不是有效日期');
      return date.getDate();
    }

    // DATE
    if (processedFormula.toUpperCase().startsWith('DATE(') && processedFormula.endsWith(')')) {
      const content = processedFormula.substring(5, processedFormula.length - 1);
      const parts = content.split(',');
      if (parts.length !== 3) throw new Error('DATE函数需要三个参数 (年,月,日)');

      const year = parseInt(calculate({ text: parts[0].trim(), variables }));
      const month = parseInt(calculate({ text: parts[1].trim(), variables })) - 1; // JavaScript 月份从 0 开始
      const day = parseInt(calculate({ text: parts[2].trim(), variables }));

      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) throw new Error('DATE函数参数无效');

      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    // 处理数值计算
    if (!isNaN(parseFloat(processedFormula))) {
      return parseFloat(processedFormula);
    }

    // 无法识别的公式或变量
    return processedFormula;
  } catch (error) {
    console.error('公式计算错误:', error);
    return '计算错误: ' + error.message;
  }
};

// 监视公式数据变化
export const formulaWatcher = (formData, formula, callback) => {
  if (!formula) {
    callback('');
    return () => { };
  }

  // 计算当前结果
  try {
    const result = calculate({
      text: formula,
      variables: formData
    });

    callback(result);
  } catch (error) {
    console.error('公式计算错误:', error);
    callback('计算错误: ' + error.message);
  }

  // 返回清理函数
  return () => { };
};