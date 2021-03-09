<template>
  <div>
    <!-- <div contenteditable='true'>哈哈</div>
    document.execCommand('') -->
    <!-- 1. 简单的第三方的
      tinyMce,wangEditor
    -->
    <!-- 2. 开源的定制 slate.js -->
    <!-- 3. 有专门的编辑器开发团 word在线版
     -->
    <div class="write-btn">
      <el-button type='primary' @click='submit'>
        提交
      </el-button>
    </div>
    <el-row :gutter="20">
      <el-col :span='12'>
        <!-- markdown编辑器的基本操作 -->
        <textarea ref='editor' class='md-editor' :value='content' @input='update'></textarea>
      </el-col>
      <el-col :span='12'>
        <div class='markdown-body' v-html='compiledContent'></div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
  import marked from 'marked'
  import hljs, { highlight } from 'highlight.js'
  import javascript from 'highlight.js/lib/languages/javascript'
  import 'highlight.js/styles/monokai-sublime.css'

  export default {
    middleware:['auth'],
    data() {
      return {
        content: `# 雷米的一天
* 上课
* 干饭
* 写代码

\`\`\`javascript
  bindEvents(){
        this.$refs.editor.addEventListener('paste',async e=>{
          const files = e.clipboardData.files
          console.log(files);
          // 直接上传
        })
        this.$refs.editor.addEventListener('drop',async e=>{
          const files = e.dataTransfer.files
          console.log(files);
          // !todo 上传文件
          e.preventDefault()
          // 直接上传
        })
      },
\`\`\``
      }
    },
    mounted () {
      this.timer = null
      this.bindEvents()

      marked.setOptions({
        rendered: new marked.Renderer(),
        highlight(code){
          return hljs.highlightAuto(code).value
        }
      })
    },
    computed: {
      compiledContent() {
        return marked(this.content,{})
      }
    },
    methods: {
      bindEvents(){
        this.$refs.editor.addEventListener('paste',async e=>{
          const files = e.clipboardData.files
          console.log(files);
          // 直接上传
        })
        this.$refs.editor.addEventListener('drop',async e=>{
          const files = e.dataTransfer.files
          console.log(files);
          // !todo 上传文件
          e.preventDefault()
          // 直接上传
        })
      },
      async submit() {
        // 文章列表、点赞、关注、草稿
        let ret = await this.$http.post('/article/create',{
          content:this.content, // selected:false
          compiledContent:this.compiledContent // 显示只读去这个
        })
      },
      update(e){
        this.timer&&clearTimeout(this.timer)
        this.timer = setTimeout(() => {
          this.content = e.target.value  
        }, 350);
        
      }
    },
  }
</script>

<style lang="scss" scoped>
.md-editor{
  width: 100%;
  max-width: 100%;
  min-width: 100%;
  height: calc(100vh - 50px);
  outline: none;
}
.write-btn{
  position: fixed;
  z-index: 100;
  right: 30px;
  top: 10px;
}
</style>
