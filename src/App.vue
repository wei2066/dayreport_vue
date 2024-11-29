<template>
  <div class="expense-tracker" :class="{ 'dark-mode': isDarkMode }">
    <div class="mode-switch">
      <button class="mode-toggle" @click="toggleDarkMode">
        {{ isDarkMode ? '☀️' : '🌙' }}
      </button>
    </div>
    <h1>每日记账</h1>
    
    <div class="expense-input">
      <input 
        type="number" 
        v-model="amount" 
        placeholder="请输入金额"
        class="amount-input"
      >
      
      <div class="tags-section">
        <h3>预设标签</h3>
        <div class="tags-container">
          <button 
            v-for="tag in predefinedTags" 
            :key="tag"
            :class="['tag-btn', selectedTag === tag ? 'active' : '']"
            @click="selectTag(tag)"
          >
            {{ tag }}
          </button>
        </div>

        <h3>自定义标签</h3>
        <div class="tags-container">
          <button 
            v-for="tag in customTags" 
            :key="tag"
            :class="['tag-btn custom-saved-tag', selectedTag === tag ? 'active' : '']"
            @click="selectTag(tag)"
          >
            {{ tag }}
            <span class="remove-tag" @click.stop="removeCustomTag(tag)">×</span>
          </button>
          
          <div class="custom-tag-input" v-if="showCustomTagInput">
            <input 
              type="text" 
              v-model="customTag"
              placeholder="输入自定义标签"
              @keyup.enter="addCustomTag"
              ref="customTagInput"
            >
            <button class="confirm-tag-btn" @click="addCustomTag">确定</button>
          </div>
          <button 
            class="tag-btn custom-tag-btn"
            @click="showCustomTagInput = true"
            v-if="!showCustomTagInput"
          >
            + 自定义标签
          </button>
        </div>
      </div>

      <button class="submit-btn" @click="addExpense">添加支出</button>
    </div>

    <div class="expense-list">
      <h2>今日支出</h2>
      <div v-if="!sortedExpenses.length" class="no-expenses">
        还没有记录支出
      </div>
      <div v-else class="expense-items">
        <div v-for="(expense, index) in sortedExpenses" :key="index" class="expense-item">
          <span class="expense-amount">¥{{ expense.amount.toFixed(2) }}</span>
          <span class="expense-tag">{{ expense.tag }}</span>
          <span class="expense-time">{{ expense.time }}</span>
          <button class="delete-btn" @click="deleteExpense(expense.id)">Del</button>
        </div>
      </div>
      <div class="total">
        今日总支出: ¥{{ totalExpense }}
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'App',
  data() {
    return {
      amount: '',
      selectedTag: '',
      predefinedTags: ['餐饮', '交通', '购物', '娱乐'],
      customTags: [],
      expenses: [],
      showCustomTagInput: false,
      customTag: '',
      currentDate: new Date().toISOString().split('T')[0], // 当前日期，格式：YYYY-MM-DD
      isDarkMode: localStorage.getItem('darkMode') === 'true'
    }
  },
  methods: {
    // 获取支出记录
    async fetchExpenses() {
      try {
        const formattedDate = new Date().toISOString().slice(0, 10)
        console.log('Requesting date:', formattedDate)
        
        const response = await axios.get(`http://10.40.130.167:3000/api/expenses/${formattedDate}`)
        console.log('API Response:', response.data)

        if (!response.data || !response.data.success || !Array.isArray(response.data.data)) {
          console.error('Invalid response format:', response.data)
          this.expenses = []
          return
        }

        this.expenses = response.data.data.map(expense => ({
          id: expense.id,
          amount: Number(expense.amount),
          tag: expense.tag,
          time: expense.created_at 
            ? new Date(expense.created_at).toLocaleTimeString()
            : new Date().toLocaleTimeString()
        }))

        console.log('Processed expenses:', this.expenses)
      } catch (error) {
        console.error('获取支出记录失败:', error)
        console.error('错误详情:', error.response?.data)
        this.expenses = []
        alert('获取支出记录失败')
      }
    },

    // 添加支出记录
    async addExpense() {
      if (!this.amount || !this.selectedTag) {
        alert('请输入金额和选择标签')
        return
      }

      try {
        const formattedDate = new Date().toISOString().slice(0, 10)
        
        await axios.post('http://10.40.130.167:3000/api/expenses', {
          amount: Number(this.amount),
          tag: this.selectedTag,
          date: formattedDate // 添加日期字段
        })

        // 重新获取最新支出记录
        await this.fetchExpenses()
        
        // 重置输入
        this.amount = ''
        this.selectedTag = ''
      } catch (error) {
        console.error('添加支出失败:', error)
        alert('添加支出失败')
      }
    },

    // 修改删除方法
    async deleteExpense(id) {
      try {
        if (!confirm('确定要删除这条记录吗？')) {
          return
        }
        const response = await axios.post('http://10.40.130.167:3000/api/expenses/delete', {
          id: id
        })
        
        if (response.data.success) {
          await this.fetchExpenses() // 重新获取支出记录
          alert('删除成功')
        } else {
          throw new Error(response.data.message || '删除失败')
        }
      } catch (error) {
        console.error('删除失败:', error)
        alert('删除失败: ' + (error.response?.data?.message || error.message))
      }
    },

    // 其他现有方法保持不变...
    selectTag(tag) {
      this.selectedTag = tag
      this.showCustomTagInput = false
    },

    addCustomTag() {
      if (this.customTag.trim()) {
        const newTag = this.customTag.trim()
        if (!this.allTags.includes(newTag)) {
          this.customTags.push(newTag)
          this.saveCustomTags()
        }
        this.selectedTag = newTag
        this.showCustomTagInput = false
        this.customTag = ''
      }
    },

    removeCustomTag(tag) {
      const index = this.customTags.indexOf(tag)
      if (index !== -1) {
        this.customTags.splice(index, 1)
        this.saveCustomTags()
        if (this.selectedTag === tag) {
          this.selectedTag = ''
        }
      }
    },

    saveCustomTags() {
      localStorage.setItem('customTags', JSON.stringify(this.customTags))
    },

    loadCustomTags() {
      const savedTags = localStorage.getItem('customTags')
      if (savedTags) {
        this.customTags = JSON.parse(savedTags)
      }
    },

    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode
      localStorage.setItem('darkMode', this.isDarkMode)
    }
  },
  computed: {
    allTags() {
      return [...this.predefinedTags, ...this.customTags]
    },
    totalExpense() {
      return this.expenses.reduce((sum, expense) => {
        const amount = typeof expense.amount === 'string' 
          ? parseFloat(expense.amount) 
          : Number(expense.amount)
        return sum + (isNaN(amount) ? 0 : amount)
      }, 0).toFixed(2)
    },
    // 添加排序后的支出列表
    sortedExpenses() {
      return [...this.expenses].sort((a, b) => {
        // 使用创建时间进行倒序排序
        const timeA = new Date(a.created_at || 0).getTime()
        const timeB = new Date(b.created_at || 0).getTime()
        return timeB - timeA
      })
    }
  },
  // 组件创建时加载���据
  async created() {
    this.loadCustomTags()
    await this.fetchExpenses()
  }
}
</script>

<style>
/* 基础容器样式 */
.expense-tracker {
  max-width: 100%;
  margin: 0 auto;
  padding: 10px;
  box-sizing: border-box;
}

/* 基础样式 */
body {
  background: #f5f5f5;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
}

/* 标题样式 */
h1 {
  font-size: 1.5rem;
  margin: 15px 0;
  text-align: center;
  color: #2c3e50;
}

h2 {
  font-size: 1.2rem;
  color: #2c3e50;
}

h3 {
  font-size: 1rem;
  color: #666;
  margin: 15px 0 10px;
}

/* 输入区域样式 */
.expense-input {
  background: #fff;
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 15px;
}

.amount-input {
  width: 100%;
  padding: 15px;
  font-size: 1.2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 15px;
  box-sizing: border-box;
}

/* 标签样式 */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
  justify-content: flex-start;
}

.tag-btn {
  padding: 10px 20px;
  font-size: 0.9rem;
  border: 1px solid #ddd;
  border-radius: 25px;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.3s;
  margin: 5px;
  flex-grow: 1;
  text-align: center;
  min-width: calc(50% - 20px);
}

.tag-btn.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

.custom-tag-btn {
  background: #fff;
  border: 1px dashed #42b983;
  color: #42b983;
}

/* 自定义标签输入框 */
.custom-tag-input {
  width: 100%;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.custom-tag-input input {
  flex: 1;
  min-width: 150px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 1rem;
  outline: none;
}

.custom-tag-input input:focus {
  border-color: #42b983;
}

.confirm-tag-btn {
  padding: 12px 20px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 1rem;
  cursor: pointer;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  padding: 15px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  margin-top: 10px;
}

/* 支出列表样式 */
.expense-list {
  background: #fff;
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-top: 15px;
}

.expense-item {
  display: flex;
  justify-content: space-between;
  padding: 15px 10px;
  border-bottom: 1px solid #eee;
  align-items: center;
  font-size: 0.9rem;
}

.expense-amount {
  font-weight: bold;
  color: #e74c3c;
  font-size: 1.1rem;
}

.expense-tag {
  background: #f0f0f0;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.9rem;
}

.expense-time {
  color: #666;
  font-size: 0.9rem;
}

/* 删除按钮 */
.delete-btn {
  background: #ff4757;
  color: white;
  border: none;
  border-radius: 12px; /* 修改为固定的圆角值 */
  width: 55px; /* 更适合矩形的宽度 */
  height: 30px;
  line-height: 30px;
  text-align: center;
  cursor: pointer;
  font-size: 16px; /* 更适合圆角矩形的字体大小 */
  transition: all 0.3s;
}

.delete-btn:hover {
  background: #ff6b81;
  transform: scale(1.05); /* 鼠标悬停时稍微放大 */
}

/* 总计样式 */
.total {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 2px solid #eee;
  font-weight: bold;
  text-align: right;
  font-size: 1.1rem;
}

.no-expenses {
  text-align: center;
  color: #999;
  padding: 20px;
}

/* 自定义标签样式 */
.custom-saved-tag {
  position: relative;
  padding-right: 28px;
}

.remove-tag {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-size: 14px;
}

.remove-tag:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* 暗色模式样式 */
.dark-mode {
  background: #1a1a1a;
  color: #fff;
}

.dark-mode h1,
.dark-mode h2,
.dark-mode h3 {
  color: #fff;
}

.dark-mode .expense-input,
.dark-mode .expense-list {
  background: #2d2d2d;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.dark-mode .amount-input {
  background: #1a1a1a;
  border-color: #3d3d3d;
  color: #fff;
}

.dark-mode .tag-btn {
  background: #3d3d3d;
  border-color: #4d4d4d;
  color: #fff;
}

.dark-mode .tag-btn.active {
  background: #42b983;
  border-color: #42b983;
}

.dark-mode .custom-tag-btn {
  background: #2d2d2d;
  border-color: #42b983;
}

.dark-mode .custom-tag-input input {
  background: #1a1a1a;
  border-color: #3d3d3d;
  color: #fff;
}

.dark-mode .expense-item {
  border-bottom-color: #3d3d3d;
}

.dark-mode .expense-tag {
  background: #3d3d3d;
  color: #fff;
}

.dark-mode .total {
  border-top-color: #3d3d3d;
}

/* 响应式调整 */
@media screen and (max-width: 480px) {
  .expense-tracker {
    padding: 10px;
  }

  .tag-btn {
    min-width: calc(33.33% - 10px);
    padding: 8px 12px;
    font-size: 0.85rem;
  }

  .expense-item {
    flex-wrap: wrap;
    gap: 5px;
  }

  .expense-amount {
    width: 40%;
  }

  .expense-tag {
    width: 30%;
  }

  .expense-time {
    width: 100%;
    font-size: 0.8rem;
  }
}

/* 触摸设备的反馈效果 */
@media (hover: none) {
  .tag-btn:active,
  .submit-btn:active,
  .delete-btn:active {
    opacity: 0.7;
    transform: scale(0.98);
  }
}
</style>
