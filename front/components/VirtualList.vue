<template>
  <div ref='list' class='list-container' @scroll='scrollEvent($event)'>
    <div 
      class="list-phantom" 
      :style='{
        height:listHeight+"px"
      }'
    >
    </div>
    <div 
      class="list" 
      :style='{
        top:getTop
      }'
    >
    <ArticleItem 
      class='list-item' 
      v-for='item in listData' 
      :key='item._id'
      :article='item'
      :style='{height:size+"px"}'
    >
    </ArticleItem>
    </div>
  </div>
</template>

<script>
import ArticleItem from './ArticleItem.vue'
  export default {
    components: {
      ArticleItem,
    },
    props: {
      listData: {
        type: Array,
        default: ()=>[]
      },
      size:Number,
      default:200
    },
    data() {
      return {
        screenHeight: 800,
        startOffset:0,
        start:0, // 开始的索引
        end:4 // 结束的索引
      }
    },
    mounted () {
      this.end = this.start + this.visibleCount
    },
    computed: {
      listHeight() {
        return this.listData.length*this.size 
      },
      getTop(){
        return `${this.startOffset}px`
      },
      visibleCount(){
        return Math.ceil(this.screenHeight/this.size)
      },
      visibleData(){
        return this.listData.slice(this.start,Math.min(this.end,this.listData.length))
      }
    },
    methods: {
      scrollEvent() {
        let scrollTop = this.$ref.list.scrollTop

        this.start = Math.floor(scrollTop/this.size)
        this.end = this.start + this.visibleCount
        this.startOffset = scrollTop-(scrollTop%this.size)
      }
    },
  }
</script>

<style lang="scss" scoped>
.list-container{
  height: 100%;
  overflow: hidden;
  position: relative;
}
.list-phantom{
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  z-index: -1;
}
.list{
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
}
</style>
