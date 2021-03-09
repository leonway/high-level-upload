'use strict'

const svgCaptcha = require('svg-captcha')
const BaseController = require('./base')
const fse = require('fs-extra')
const path = require('path')

class UtilController extends BaseController {
  async captcha() {
    const { ctx } = this
    const captcha = svgCaptcha.create({
      size: 4,
      fontSize: 50,
      width: 100,
      height: 40,
      noise: 3,
    })

    ctx.session.captcha = captcha.text
    console.log('captcha=>', captcha.text)
    ctx.response.type = 'image/svg+xml'
    ctx.body = captcha.data
  }

  async mergefile(){
    const {ext,name,hash,size} = this.ctx.request.body
    const filePath = path.resolve(this.config.UPLOAD_DIR,`${hash}.${ext}`)

    await this.ctx.service.tools.mergeFile(filePath,hash,size)
    this.success({
      data:`/public/${hash}.${ext}`
    })
  }

  async checkfile(){
    try {
      const { ctx } = this
    const { ext, hash } = ctx.request.body
    const filePath = path.resolve(this.config.UPLOAD_DIR,`${hash}.${ext}`)
    
    let uploaded = false
    let uploadedList = []

    if(fse.existsSync(filePath)){
      // 文件存在
      uploaded = true
    }{
      uploadedList = await this.getUploadedList(path.resolve(this.config.UPLOAD_DIR,hash))
    }
    this.success({
      uploaded,
      uploadedList
    })
    } catch (e) {
      console.log('-----------------');
      console.log(e);
    }
  }

  async getUploadedList(dirPath){
    return fse.existsSync(dirPath)
    // 过滤不必要的文件
              ?(await fse.readdir(dirPath)).filter(name=>name[0]!=='.')
              :[]
  }

  async uploadfile() {
    // 报错
    if(Math.random()>.5){
      return this.ctx.status = 500
    }
    const { ctx } = this
    const file = ctx.request.files[0]
    const { name, hash } = ctx.request.body

    const chunkPath = path.resolve(this.config.UPLOAD_DIR,hash)
    // const filePath = path.resolve() //文件最终存储的位置 合并之后
    // console.log(name, file)
    if(!fse.existsSync(chunkPath)){
      await fse.mkdir(chunkPath)
    }
    
    await fse.move(file.filepath,`${chunkPath}/${name}`)
    this.message('切片上传成功')
  }

  async sendcode() {
    const { ctx } = this
    const email = ctx.query.email
    const code = Math.random().toString().slice(2, 6)
    console.log('邮箱' + email + '验证码' + code)
    ctx.session.emailcode = code

    const subject = 'reameyblog验证码'
    const text = ''
    const html = `<h2>雷米社区</h2><a href="http://reameycao.com"><span>${code}</span></a>`

    const hasSend = await this.service.tools.sendMail(email, subject, text, html)

    if (hasSend) {
      this.message('发送成功')
    } else {
      this.error('发送失败')
    }
  }
}

module.exports = UtilController
