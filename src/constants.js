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
  { name: '创建时间', type: FIELD_TYPES.DATETIME, mapping: 'createTime' },
  { name: '更新时间', type: FIELD_TYPES.DATETIME, mapping: 'updateTime' },
];

// ==== 函数分组 ====
export const FUNCTION_GROUPS = {
  基础运算: ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'SUM', 'AVERAGE'],
  // 逻辑函数: ['IF', 'AND', 'OR', 'NOT', 'ISEMPTY', 'EQ'],
  逻辑函数: ['IF'],
  // 文本函数: ['CONCATENATE', 'LEFT', 'RIGHT', 'TRIM'],
  文本函数: ['CONCATENATE'],
  // 其他函数: ['LOGINUSER', 'NOW', 'TODAY', 'UPDATE'],
};

// ==== 函数定义 ====
export const FUNCTIONS = {
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