const views  = require('koa-views')
const serve = require('koa-static')
const { resolve } = require('path')

const r = path => resolve(__dirname, path)

export const dev = async app => {
    app.use(serve(r('../../../manage-web/dist')))
    app.use(views(r('../../../manage-web/dist')), {
        extension: 'html'
    })

    app.use(async (ctx) => {
        await ctx.render('index.html')
    })
}