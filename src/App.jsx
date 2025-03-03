// App.jsx
import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import FormulaEditor from './components/FormulaEditor';
import './App.css';

// 导入常量
import { FIELDS, FIELD_TYPES, FIELD_TYPE_CONFIGS, FUNCTION_GROUPS, FUNCTIONS } from './constants';

function App() {
  return (
    <div className="app">
      <FormulaEditor
        // height="800px"
        fields={FIELDS}
        fieldTypes={FIELD_TYPES}
        fieldTypeConfigs={FIELD_TYPE_CONFIGS}
        functionGroups={FUNCTION_GROUPS}
        functionDefinitions={FUNCTIONS}
      />
    </div>
  );
}

export default App;
