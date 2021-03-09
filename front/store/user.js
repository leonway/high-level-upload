import { http } from '../plugins/axios'

export const namespace = true
export const state = () => ({
  token: '',
  id:'',
  email:'',
  nickname:'',
  avatar:''
})

export const mutations = {
  SET_TOKEN: (state, payload) => {
    state.token = payload
  },
  SET_USER:(state, payload) => {
    state.id = payload._id
    state.email = payload.email
    state.nickname = payload.nickname
    state.avatar = payload.avatar
  },
}

export const actions = {
  detail:async ({ commit,state },data)=> {
    let ret = await http.get('/user/detail')
    if(ret.code==0){
      commit('SET_USER',ret.data)
      return ret
    }
  }
}
