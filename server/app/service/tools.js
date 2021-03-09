'use strict'

const Service = require('egg').Service
const nodemailer = require('nodemailer')
const fse = require('fs-extra')
const path = require('path')

const userEmail = '17318077256@163.com'
const transporter = nodemailer.createTransport({
  service: '163',
  secureConnection: true,
  auth: {
    user: userEmail,
    pass: 'BGYPAKCEEICWOIFZ',
  },
})

class ToolService extends Service {
  async mergeFile(filePath,filehash,size){
    const chunkDir = path.resolve(this.config.UPLOAD_DIR,filehash)// 切片的文件夹
    let chunks = await fse.readdir(chunkDir)
    chunks.sort((a,b)=>a.split('-')[1]-b.split('-')[1])
    chunks = chunks.map(cp=>path.resolve(chunkDir,cp))
    await this.mergeChunks(chunks,filePath,size)
  }

  async mergeChunks(files,dest,size){
    const pipStream = (filePath,writeStream)=>new Promise(res=>{
      const readStream = fse.createReadStream(filePath)
      readStream.on('end',()=>{
        fse.unlinkSync(filePath)
        res()
      })
      readStream.pipe(writeStream)
    })

    await Promise.all(
      files.map((file,index)=>{
        const start = index*size
        console.log(start,index,size);
        pipStream(file,fse.createWriteStream(dest,{
          start,
          end:(index+1)*size
        }))
      })
    )
  }

  async sendMail(email, subject, text, html) {
    const mailOptions = {
      from: userEmail,
      to: email,
      subject,
      text,
      html,
      cc: userEmail,
    }
    try {
      await transporter.sendMail(mailOptions)
      return true
    } catch (e) {
      console.log('emaill error', e)
      return false
    }
  }
}

module.exports = ToolService
