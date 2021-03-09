<template>
  <div>
    <h1>
      用户中心
    </h1>
    <div>
      <div ref='drag' id='drag'>
        <input type="file" name='file' @change="handleFileChange">
      </div>
      <div>
        <el-progress :stroke-width='20' :text-inside='true' :percentage='uploadProgress'></el-progress>
      </div>
    </div>
    <div>
      <el-button @click='uploadFile'>上传</el-button>
    </div>
    <div>
      <p>计算hash的进度</p>
       <el-progress :stroke-width='20' :text-inside='true' :percentage='hashProgress'></el-progress>
    </div>
    <div>
      <!-- chunk.progress
      progress<0 报错 显示红色
      == 100 成功
      别的数字 方块高度显示 -->
      <!-- 尽可能让方块看起来是正方形
      比如4*4 3*3 10*10 -->
      <div 
        class="cube-container" 
        :style='{
          width:cubeWidth+"px"
        }'
      >
        <div 
          class="cube" 
          v-for='chunk in chunks' 
          :key='chunk.name' 
        >
          <div 
            :class='{
            "uploading":chunk.progress>0&&chunk.progress<100,
            "success":chunk.progress==100,
            "error":chunk.progress<0
            }'
            :style='{
              height:chunk.progress+"%"
            }'
          >
            <i class='el-icon-loading' style='color:#f56c6c' v-if='chunk.progress<100&&chunk.progress>0'></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import sparkMD5 from 'spark-md5'
const CHUNK_SIZE = 0.5*1024*1024

  export default {
    async mounted () {
      const ret = await this.$http.get('/user/info')
      console.log(ret);
      const drag = this.$refs.drag
      drag.addEventListener('dragover',e=>{
        drag.style.borderColor = 'red'
        e.preventDefault()
      })
      drag.addEventListener('dragleave',e=>{
        drag.style.borderColor = '#eee'
        e.preventDefault()
      })
      drag.addEventListener('drop',e=>{
        const fileList = e.dataTransfer.files
        drag.style.borderColor = '#eee'
        this.file = fileList[0]
        e.preventDefault()
      })
    },    
    data() {
      return {
        file: null,
        // uploadProgress:0,
        hashProgress:0,
        chunks:[]
      }
    },
    computed: {
      cubeWidth() {
        return Math.ceil(Math.sqrt(this.chunks.length))*16 
      },
      uploadProgress(){
        if(!this.file||this.chunks.length){
          return 0
        }
        const loaded = this.chunks
        .map(item=>item.chunk.size*item.progress)
        .reduce((acc,cur)=>acc+cur,0)
        return Number(((loaded*100)/this.file.size).toFixed(2))
      }
    },
    methods: {
      async blobToString(blob){
        return new Promise(res=>{
          const reader = new FileReader()
          reader.onload = function() {
            // console.log(reader.result);
            const ret = reader.result
                          .split('')
                          .map(v=>v.charCodeAt())
                          .map(v=>v.toString(16).toUpperCase())
                          // .map(v=>v.padStart(2,'0'))
                          .join(' ')
            res(ret)
          }
          reader.readAsBinaryString(blob)
        })
      },
      async isGif(file){
        // GIF89a 和 GIF87a
        // 前面六个 十六进制是 47 49 46 38 39 61 或者 47 49 46 38 37 61
        const ret = await this.blobToString(file.slice(0,6))
        const isGif = (ret ==='47 49 46 38 39 61')||(ret ==='47 49 46 38 37 61')
        return isGif
      },
      async isPng(file){
        const ret = await this.blobToString(file.slice(0,8))
        const ispng = (ret ==='89 50 4E 47 0D 0A 1A 0A')
        return ispng
      },
      async isJpg(file){
        const len = file.size
        const start = await this.blobToString(file.slice(0,2))
        const end = await this.blobToString(file.slice(-2,len))
        const isjpg = (start =='FF D8')&&(end =='FF D9')
        // console.log(isjpg);
        return isjpg
      },
      async isImage(file){
        console.log('-------');
        // 通过文件流来判断
        return await this.isGif(file) ||await this.isPng(file)|| await this.isJpg(file)
      },
      createFileChunk(file,size = CHUNK_SIZE){
        const chunks = []
        let cur = 0
        // console.log(file);
        while(cur<this.file.size){
          chunks.push({
            index:cur,
            file:this.file.slice(cur,cur+size)
          })
          cur+=size
        }
        return chunks
      },
      // web-worker 版
      async calculateHashWorker(){
        return new Promise(res=>{
          this.worker = new Worker('/hash.js')
          this.worker.postMessage({
            chunks:this.chunks
          })
          this.worker.onmessage = e=>{
            const { progress, hash } = e.data
            this.hashProgress = Number(progress.toFixed(2))
            if(hash){
              res(hash)
            }
          }
        })
      },
      // requestIdleCallback 时间切片
      async calculateHashIdle(){
        return new Promise(res=>{
          const chunks = this.chunks
          const spark = new sparkMD5.ArrayBuffer()
          let count = 0

          const appendToSpark = async file=>{
            return new Promise(resolve=>{
              const reader = new FileReader()
              reader.readAsArrayBuffer(file)
              reader.onload = e=>{
                spark.append(e.target.result)
                resolve()
              }
            })
          }
          const workLoop = async deadline =>{
            while(count<chunks.length&&deadline.timeRemaining()>1){
              // 空闲时间,且有任务
              await appendToSpark(chunks[count].file)
              count++
              if(count<chunks.length){
                this.hashProgress = Number(
                  ((100*count)/chunks.length).toFixed(2)
                )
              }else{
                this.hashProgress = 100
                res(spark.end())
              }
            }
            window.requestIdleCallback(workLoop)
          }
          window.requestIdleCallback(workLoop)
        })
      },
      async calculateHashSample(){
        // 布隆过滤器 判断一个数据存在与否
        // 1个G的文件，抽样后5M以内
        // hash一样 文件不一定一样
        // hash不一样 文件一定不一样
        return new Promise(res=>{
          const spark = new sparkMD5.ArrayBuffer()
          const reader = new FileReader()

          const file = this.file
          const size = file.size
          const offset = 2*1024*1024
          // 第一个2M， 最后一个区块数据全要
          let chunks = [file.slice(0,offset)]

          let cur = offset
          while(cur<size){
            if(cur+offset>=size){
              // 最后一个区块
              chunks.push(file.slice(cur,cur+offset))

            }else{
              // 中间区块
              const mid = cur+offset/2
              const end = cur+offset
              chunks.push(file.slice(cur,cur+2))
              chunks.push(file.slice(cur,mid+2))
              chunks.push(file.slice(end-2,end))
            }
            cur += offset
          }
          // 中间的，取钱中华各两个字节
          reader.readAsArrayBuffer(new Blob(chunks))
          reader.onload = e=>{
            spark.append(e.target.result)
            this.hashProgress = 100
            res(spark.end())
          }
        })
      },
      async uploadChunks(uploadedList){
          const requests = this.chunks
        .filter(chunk=>!uploadedList.includes(chunk.name))
        .map((chunk,index)=>{
          // 转成Promise
          const form = new FormData()
          form.append('chunk',chunk.chunk)
          form.append('hash',chunk.hash)
          form.append('name',chunk.name)
          // form.append('index',chunk.index)
          return {form,index:chunk.index,error:0}
        })
        // .map(({form,index})=>this.$http.post('/uploadfile',form,{
        //   onUploadProgress:progress=>{
        //     // 每个片端 自己的进度条， 整体的需要计算
        //     this.chunks[index].progress = Number(
        //       ((progress.loaded/progress.total)*100).toFixed(2)
        //     )
        //   }
        // }))
        // !todo 并发量控制
        // 尝试申请tcp连接过多
        // 异步的并发控制
        // await Promise.all(requests)
        await this.sendRequest(requests)
        await this.mergeRequest()
        // const form = new FormData()
        // form.append('name','file')
        // form.append('file',this.file)
        // const ret = await this.$http.post('/uploadfile',form,{
        //   onUploadProgress:progress=>{
        //     this.uploadProgress = Number(((progress.loaded/progress.total)*100).toFixed(2))
        //   }
        // })
        // console.log(ret);
      },
      // 上传可能报错
      // 报错之后，进度条飘红，开始重拾
      // 一个切片重试失败三次，整体全部终止
      async sendRequest(chunks,limit=3){
        // limit 并发数
        return new Promise((res,rej)=>{
          const len = chunks.length
          let isStop = false
          let count = 0
          const start = async ()=>{
            if(isStop) return
            const task = chunks.shift()
            if(task){
              const { form, index } = task
              try {
                  await this.$http.post('/uploadfile',form,{
                    onUploadProgress:progress=>{
                      // 每个片端 自己的进度条， 整体的需要计算
                      this.chunks[index].progress = Number(
                        ((progress.loaded/progress.total)*100).toFixed(2)
                      )
                    }
                  })
                  if(count==len-1){
                    // 最后一个任务
                    res()
                  }else{
                    count++
                    // 启动下一个任务
                    start()
                  } 
              } catch (e) {
                this.chunks[index].progress = -1
                if(task.error<3){
                  task.error++
                  chunks.unshift(task)
                  start()
                }else{
                  // 错误三次
                  isStop = true
                  rej()
                }
              }
            }
          }

          while(limit > 0){
            // 启动limit个任务
            // 模拟一下延迟
            // console.log(limit);
            setTimeout(() => {
              start()
            }, Math.random()*2000);
             limit-=1  
          }
        })
      },
      async mergeRequest(){
        this.$http.post('mergefile',{
          ext:this.file.name.split('.').pop(),
          size:CHUNK_SIZE,
          hash:this.hash
        })
      },
      async uploadFile(){
        if(!this.file)return
        // if(!(await this.isImage(this.file))){
        //   alert('文件格式不对~')
        //   return
        // }else{
        //   console.log('格式正确');
        // }
        // return
        const chunks = this.createFileChunk(this.file)
        console.log(chunks);
        // const hash = await this.calculateHashWorker()
        // const hash1 = await this.calculateHashIdle()
        // console.log('文件hash',hash);
        // console.log('文件hash1',hash1);
        const hash = await this.calculateHashSample()
        this.hash = hash

        //问一下后端 文件是否上传过，如果有，是否有存在的切片
        const { data:{uploaded, uploadedList,} } = await this.$http.post('/checkfile',{
          hash:this.hash,
          ext:this.file.name.split('.').pop()
        })

        if(uploaded){
          // 秒传
          return this.$message.success('秒传成功！')
        }
        // console.log('文件hash2',hash2);
        // 抽样hash 不算全量
        // 布隆过滤器 损失一小部分精度，换取效率
        this.chunks = chunks.map((chunk,index)=>{
          // 切片的名字， hash+index
          const name = hash+'-'+index
          return {
            hash,
            name,
            index,
            chunk:chunk.file,
            // progress:0
            // 设置初始进度条 已上传过 设为100
            progress:uploadedList.indexOf(name)>-1?100:0
          }
        })
        await this.uploadChunks(uploadedList)
        
      },
      handleFileChange(e) {
        const [ file ] = e.target.files
        
        if(!file) return
        this.file = file
      }
    },
  }
</script>

<style lang='scss' scoped>
  #drag{
    height: 100px;
    // width: 100px;
    line-height: 100px;
    border: 2px dashed #eee;
    text-align:center;
    vertical-align: middle;
    // &:hover{
    //   border-color: red;
    // }
  }
  .cube-container{
    .cube{
      width:14px;
      height: 14px;
      line-height: 12px;
      border:1px black solid;
      background: #eee;
      float:left;
      >.success{
        background: green;
      }
      >.uploading{
        background: blue;
      }
      >.error{
        background: red;
      }
    }
  }
</style>
