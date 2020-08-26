import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

var LUtils = {};

//加载GLTF模型
//src 模型地址   fun 回调方法 接受的参数为模型
//可以加载多个
LUtils.loadGLTF = function (srcs,fun) {
    let start_time = (new Date()).getTime();
    let loader = new GLTFLoader();
    let returnObj = new Array(srcs.length);
    let index = 0;
    for(let i = 0;i<srcs.length;i++){
        loader.load(srcs[i], function (gltf) {
                ++index;
                returnObj[i] = gltf.scene;
                if(index==srcs.length){
                    let start_time2 = (new Date()).getTime();
                    console.log(index+"个GLTF模型加载时间 "+(start_time2 - start_time)/1000 + " 秒");
                    fun(returnObj);
                }
            },
            function (xhr) {
                console.log("loadeding ...  "+( xhr.loaded / xhr.total * 100 ).toFixed(2) + '% '+parseInt(i+1)+'个');
            });
    }
}

export default LUtils ;
