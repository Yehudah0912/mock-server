const fs = require('fs');
const Koa = require('koa');
const Router = require('koa-router');
const glob = require('glob');
const logger = require('koa-logger');
const cors = require('koa2-cors');
const { resolve } = require('path');
const app = new Koa();
const router = new Router({ prefix: '/api' });
// 存放路由映射
const routerMap = [];
// 打印每个请求和响应的数据
app.use(logger());
// 设置跨域
app.use(cors());
// 遍历api下的所有的文件夹以及文件夹下的.json并将匹配到的路径保存成一个数组
const apiUrlArr = glob.sync(resolve('./api', '**/*.json'));
// 格式化打印路由方法
function formattingMap(apiPath, target = {}) {
	let currPath = apiPath.charAt(0) == '/' ? apiPath.slice(1).split('/') : apiPath.split('/');
	if (currPath.length != 0) {
		let flag = '';
		let pathObj = {};
		while (currPath.length != 0) {
			let temp = {};
			let pop = currPath.pop();
			if (flag == '') {
				temp[pop] = target;
				pathObj = temp;
			} else {
				temp[pop] = pathObj;
				pathObj = temp;
			}
			flag = pop;
		}
		return pathObj;
	}
}
// 合并同结构数据方法
function assiginObj(target = {}, sources = {}) {
	let obj = target;
	if (typeof target != 'object' || typeof sources != 'object') {
		return sources; // 如果其中一个不是对象 就返回sources
	}
	for (let key in sources) {
		// 如果target也存在 那就再次合并
		if (target.hasOwnProperty(key)) {
			obj[key] = assiginObj(target[key], sources[key]);
		} else {
			// 不存在就直接添加
			obj[key] = sources[key];
		}
	}
	return obj;
}
if (apiUrlArr.length != 0) {
	// 注册路由
	apiUrlArr.forEach((item, i) => {
		// Json文件的相对路径
		let apiJsonPath = item && item.split('/api')[1];
		// 根据后缀名设置请求的方式
		let method =
			apiJsonPath.endsWith('.get.json')
				? 'GET'
				: apiJsonPath.endsWith('.post.json')
				? 'POST'
				: apiJsonPath.endsWith('.patch.json')
				? 'PATCH'
				: apiJsonPath.endsWith('.put.json')
				? 'PUT'
				: apiJsonPath.endsWith('.delete.json')
				? 'DEL'
				: apiJsonPath.endsWith('.json')
				? 'GET':'ALL';
		// 路由路径
		let apiPath = apiJsonPath.replace('.get.json', '').replace('.post.json', '').replace('.put.json', '').replace('.delete.json', '');
		router[method.toLowerCase()](apiPath, (ctx, next) => {
			try {
				let jsonStr = fs.readFileSync(item).toString();
				ctx.body = {
					data: JSON.parse(jsonStr),
					state: 200,
					type: 'success' // 自定义响应体
				};
			} catch (err) {
				ctx.throw('服务器错误', 500);
			}
		});
		// 记录路由
		let mapTarget = {
			method: method.toLowerCase(),
			apiPath: apiPath
		};
		// 格式化目录下路由
		routerMap.push(formattingMap(apiPath, mapTarget));
	});
	// 合并路由数组数据
	while (routerMap.length >= 2) {
		let pop = routerMap.pop();
		let shift = routerMap.shift();
		let result = assiginObj(pop, shift);
		routerMap.push(result);
	}
	// 写入文件
	let routerAddressUrl = './routerMap.json';
	fs.writeFile(routerAddressUrl, JSON.stringify(routerMap, null, 2), (err) => {
		if (!err) {
			console.log('API已更新！请在根目录 \x1b[36m%s\x1b[0m ', routerAddressUrl, '查看所有的匹配路径');
		}
	});
	app.use(router.routes()).use(router.allowedMethods());
	app.listen(8848);
} else {
	console.log('映射文件夹为空,无路由生成,请在正确的文件目录中添加作为Mock数据的json文件!');
}