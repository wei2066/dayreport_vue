const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  chainWebpack: config => {
    config.plugin('define').tap(args => {
      Object.assign(args[0], {
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
      })
      return args
    })
  }
})