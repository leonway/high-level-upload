'use strict'

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app
  const jwt = app.middleware.jwt({ app })
  // console.log('-------jwt------')
  // console.log(jwt)
  router.get('/', controller.home.index)
  // 验证码服务
  router.get('/captcha', controller.util.captcha)
  router.get('/sendcode', controller.util.sendcode)
  router.post('/uploadfile', controller.util.uploadfile)
  router.post('/mergefile', controller.util.mergefile)
  router.post('/checkfile', controller.util.checkfile)
  
  // router.post('/article', controller.util.article)
  

  router.group({ name: 'user', prefix: '/user' }, router => {
    const { info, register, login, verify } = controller.user
    router.post('/register', register)
    router.post('/login', login)
    router.get('/info', jwt, info)
    router.get('/detail', jwt, info)
    router.get('/verify', verify)
  })
}
