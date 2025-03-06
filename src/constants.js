// constants.js - 公式编辑器配置常量
// ==== 字段类型定义 ====
export const FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  DATETIME: 'datetime',
};

// ==== 字段类型UI配置 ====
export const FIELD_TYPE_CONFIGS = {
  [FIELD_TYPES.TEXT]: {
    color: 'blue',
    bgColor: 'rgba(24, 144, 255, 0.1)',
    icon: 'font',
    label: '文本',
  },
  [FIELD_TYPES.NUMBER]: {
    color: 'orange',
    bgColor: 'rgba(250, 140, 22, 0.1)',
    icon: 'number',
    label: '数值',
  },
  [FIELD_TYPES.DATETIME]: {
    color: 'purple',
    bgColor: 'rgba(114, 46, 209, 0.1)',
    icon: 'calendar',
    label: '日期时间',
  }
};

// ==== 字段列表 (包含映射信息) ====
export const FIELDS = [
  { name: '名字', type: FIELD_TYPES.TEXT, mapping: 'name' },
  { name: '性别', type: FIELD_TYPES.TEXT, mapping: 'gender' },
  { name: '年龄', type: FIELD_TYPES.NUMBER, mapping: 'age' },
  { name: '职业', type: FIELD_TYPES.TEXT, mapping: 'occupation' },
  { name: '数值', type: FIELD_TYPES.NUMBER, mapping: 'count' },
  { name: '项目数量', type: FIELD_TYPES.NUMBER, mapping: 'projectCount' },
  { name: '创建时间', type: FIELD_TYPES.DATETIME, mapping: 'createTime' },
  { name: '更新时间', type: FIELD_TYPES.DATETIME, mapping: 'updateTime' },
];

// ==== 函数分组 ====
export const FUNCTION_GROUPS = {
  基础运算: ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'AVERAGE'],
  逻辑函数: [
    // 条件判断
    'IF',
    // 逻辑与
    'AND',
    // 逻辑或
    'OR',
    // 逻辑非
    'NOT',
    // 判断是否为空
    'ISEMPTY',
    // 判断是否相等
    'EQ',
    // 判断是否大于
    'GT',
    // 判断是否小于
    'LT',
    // 判断是否大于等于
    'GTE',
    // 判断是否小于等于
    'LTE'
  ],
  文本函数: ['CONCATENATE'],
};

// ==== 函数定义 ====
export const FUNCTIONS = {
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
    minArgs: 1,
    maxArgs: Infinity,
    // 添加计算方法
    calculate: (values) => values.reduce((sum, val) =>
      (typeof val === 'number' ? sum + val : sum), 0)
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
    minArgs: 2,
    maxArgs: 2,
    calculate: (values) => values[0] - values[1]
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
    minArgs: 2,
    maxArgs: Infinity,
    calculate: (values) => values.reduce((product, val) =>
      (typeof val === 'number' ? product * val : 0), 1)
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
    minArgs: 2,
    maxArgs: 2,
    calculate: (values) => {
      if (values[1] === 0) throw new Error('除数不能为零');
      return values[0] / values[1];
    }
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
    minArgs: 3,
    maxArgs: 3,
    calculate: (values) => values[0] ? values[1] : values[2]
  },
  ISEMPTY: {
    description: '检查值是否为空',
    syntax: 'ISEMPTY(value)',
    example: 'ISEMPTY(A1) 如果A1为空则返回true',
    details:
      'ISEMPTY函数检查指定值是否为空（NULL、空字符串或未定义）。如果值为空，则返回TRUE；否则返回FALSE。',
    params: [{ name: 'value', description: '要检查的值' }],
    minArgs: 1,
    maxArgs: 1,
    calculate: (values) => {
      const value = values[0];
      return value === null || value === undefined || value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && Object.keys(value).length === 0);
    }
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
    minArgs: 1,
    maxArgs: Infinity,
    calculate: (values) => {
      const numValues = values.filter(v => typeof v === 'number');
      if (numValues.length === 0) return 0;
      return numValues.reduce((sum, val) => sum + val, 0) / numValues.length;
    }
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
    minArgs: 1,
    maxArgs: Infinity,
    calculate: (values) => values.join('')
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
    minArgs: 1,
    maxArgs: Infinity,
    calculate: (values) => values.every(Boolean)
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
    minArgs: 1,
    maxArgs: Infinity,
    calculate: (values) => values.some(Boolean)
  },
  NOT: {
    description: '对逻辑值取反',
    syntax: 'NOT(logical)',
    example: 'NOT(A1 > 10) 如果A1不大于10则返回true',
    details: 'NOT函数对传入的逻辑值取反。如果逻辑值为TRUE，则返回FALSE；如果逻辑值为FALSE，则返回TRUE。',
    params: [
      { name: 'logical', description: '要取反的逻辑表达式' }
    ],
    minArgs: 1,
    maxArgs: 1,
    calculate: (values) => !values[0]
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
    minArgs: 2,
    maxArgs: 2,
    calculate: (values) => values[0] == values[1]
  },
  GT: {
    description: '判断第一个值是否大于第二个值',
    syntax: 'GT(value1, value2)',
    example: 'GT(A1, B1) 如果A1大于B1则返回true',
    details: 'GT函数比较两个值，判断第一个值是否大于第二个值。如果是，则返回TRUE；否则返回FALSE。',
    params: [
      { name: 'value1', description: '第一个要比较的值' },
      { name: 'value2', description: '第二个要比较的值' }
    ],
    minArgs: 2,
    maxArgs: 2,
    calculate: (values) => values[0] > values[1]
  },
  LT: {
    description: '判断第一个值是否小于第二个值',
    syntax: 'LT(value1, value2)',
    example: 'LT(A1, B1) 如果A1小于B1则返回true',
    details: 'LT函数比较两个值，判断第一个值是否小于第二个值。如果是，则返回TRUE；否则返回FALSE。',
    params: [
      { name: 'value1', description: '第一个要比较的值' },
      { name: 'value2', description: '第二个要比较的值' }
    ],
    minArgs: 2,
    maxArgs: 2,
    calculate: (values) => values[0] < values[1]
  },
  GTE: {
    description: '判断第一个值是否大于等于第二个值',
    syntax: 'GTE(value1, value2)',
    example: 'GTE(A1, B1) 如果A1大于等于B1则返回true',
    details: 'GTE函数比较两个值，判断第一个值是否大于等于第二个值。如果是，则返回TRUE；否则返回FALSE。',
    params: [
      { name: 'value1', description: '第一个要比较的值' },
      { name: 'value2', description: '第二个要比较的值' }
    ],
    minArgs: 2,
    maxArgs: 2,
    calculate: (values) => values[0] >= values[1]
  },
  LTE: {
    description: '判断第一个值是否小于等于第二个值',
    syntax: 'LTE(value1, value2)',
    example: 'LTE(A1, B1) 如果A1小于等于B1则返回true',
    details: 'LTE函数比较两个值，判断第一个值是否小于等于第二个值。如果是，则返回TRUE；否则返回FALSE。',
    params: [
      { name: 'value1', description: '第一个要比较的值' },
      { name: 'value2', description: '第二个要比较的值' }
    ],
    minArgs: 2,
    maxArgs: 2,
    calculate: (values) => values[0] <= values[1]
  },
};