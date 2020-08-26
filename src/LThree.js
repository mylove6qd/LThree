/**
 * @author lcx / https://github.com/mylove6qd
 * THREE r-118
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Stats } from 'three/examples/jsm/libs/stats.module.js';
THREE.Object3D.prototype.on = function (type, fn) {
    this[type] = fn;
}
THREE.Object3D.prototype.off = function (type) {
    delete this[type];
}
//主类
class LThree {

    //构造函数
    constructor(opt) {





        //管理render事件的map
        this._renderEventMap = new Map();
        //是否冒泡
        this._isPropagation = true;
        //按下的对象
        this._mousedownObj;
        //是否按下
        this._isDown = false;
        //是否脱移
        this._isMove = false;
        //对象递归冒泡触发事件
        this._recursionEvent = function (obj, EventName, event) {
            if (obj != undefined) {
                if (obj.hasOwnProperty(EventName)) {
                    //判断是否冒泡
                    if (this._isPropagation) {
                        (obj[EventName])(event);
                    } else {
                        //不冒泡就恢复冒泡
                        this._isPropagation = true;
                        return;
                    }

                }
                this._recursionEvent(obj.parent, EventName);
            }
        }
        //发射射线
        this._shootRaycaster = function () {
            let mouse = new THREE.Vector2();
            let raycaster = new THREE.Raycaster();
            // 计算鼠标点击位置转换到3D场景后的位置
            mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
            // 由当前相机（视线位置）像点击位置发射线
            raycaster.setFromCamera(mouse, this.camera);
            let intersects = raycaster.intersectObjects(this.scene.children, true);
            if (intersects.length > 0) {
                intersects = LThree_filterVisible3dObj(intersects);
                let objs = [];
                for (let i = 0; i < intersects.length; i++) {
                    objs.push(intersects[i].object);
                }
                return objs;
            } else {
                return [this.scene];
            }
        }
        //射线获取第一个对象
        this._getRaycasterObj = function () {
            return this._shootRaycaster()[0];
        };
        //加载Stats
        this.initStats = function () {
            this.stats = new Stats();
            this.stats.domElement.style.position = 'absolute';
            this.stats.domElement.style.left = '0px';
            this.stats.domElement.style.top = '0px';
            this.container.appendChild(this.stats.dom);
            this.addRenderEvent('_statsRender', () => {
                this.stats.update();
            }, true);
        }
        //启用或停止某个event    targer true/false
        this.applyRenderEvent = function (evnetName, targer) {
            this._renderEventMap.set(evnetName, [this._renderEventMap.get(evnetName)[0], targer]);
        }
        //添加render事件
        this.addRenderEvent = function (eventName, fn, targer) {
            targer = targer == undefined ? true : targer;
            this._renderEventMap.set(eventName, [fn, targer]);
        }
        //删除redner事件
        this.removeRenderEvent = function (eventName) {
            if (this._renderEventMap.has(eventName)) {
                this._renderEventMap.delete(eventName);
            }
        };
        //阻止事件冒泡
        this.stopPropagation = function () {
            this._isPropagation = false
        }
        //渲染方法
        this.render = function (time) {

            for (let [key, value] of this._renderEventMap) {
                if (value[1]) {
                    value[0](time);
                }
            }
            this.renderer.render(this.scene, this.camera);
        };
        //更新方法
        this.update = function (time) {
            requestAnimationFrame((time) => {
                this.update(time);
            });
            this.render(time);
        };

        let option = Object.assign({
            id: opt.id,
            scene: new THREE.Scene(),
            camera: new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000),
            renderer: new THREE.WebGLRenderer({ antialias: true, alpha: true })
        }, opt)
        //基本配置
        let controls = opt.controls || new OrbitControls(option.camera, option.renderer.domElement);
        this.scene = option.scene;
        this.camera = option.camera;
        this.renderer = option.renderer;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.controls = controls;
        this.camera.lookAt(this.scene.position);
        this.controls.target.x = this.scene.position.x;
        this.controls.target.y = this.scene.position.y;
        this.controls.target.z = this.scene.position.z;
        this.container = document.getElementById(option.id);
        this.container.appendChild(this.renderer.domElement);
        //双击事件
        this.container.addEventListener("dblclick", (event) => {
            let obj = this._getRaycasterObj.bind(this)();
            this._recursionEvent(obj, 'dblclick', event)
        })
        //鼠标按下事件
        this.container.addEventListener("mousedown", (event) => {
            this._isDown = true;
            this._mousedownObj = this._getRaycasterObj.bind(this)();
        })
        //鼠标弹起事件
        this.container.addEventListener("mouseup", (event) => {
            if (this._isMove == false) {
                let obj = this._getRaycasterObj.bind(this)();
                this._recursionEvent(obj, 'click', event)
            }
            this._mousedownObj = null;
            this._isDown = false;
            this._isMove = false;
        })
        //鼠标移动事件
        this.container.addEventListener("mousemove", (event) => {
            if (this._isDown) {
                this._isMove = true;
            }
            //mouseenter  mouseleave 
            //mouseover  mouseout 
            //与 mouseout 事件不同，只有在鼠标指针离开被选元素时，才会触发 mouseleave 事件。如果鼠标指针离开任何子元素，同样会触发 mouseout 事件
        });
        //添加window 的resize事件监听 (浏览器窗口变动触发的方法)
        window.addEventListener('resize', (event) => {
            // 重新设置相机宽高比例
            this.camera.aspect = window.innerWidth / window.innerHeight;
            // 更新相机投影矩阵
            this.camera.updateProjectionMatrix();
            // 重新设置渲染器渲染范围
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
}
export { LThree ,THREE };

//------------------------------------------------------------------------------------------utils function 
//过滤射线的所有透明对象 所见即所得
function LThree_filterVisible3dObj(intersects) {
    for (var i = 0; i < intersects.length; i++) {
        if (intersects[i].object.visible == false) {
            intersects.splice(i, 1);
            continue;
        }
        if (intersects[i].object.hasOwnProperty("material") && (intersects[i].object.material.visible == false || (intersects[i].object.material.opacity == 0.0 && intersects[i].object.material.transparent == true))) {
            intersects.splice(i, 1);
            continue;
        }
    }
    return intersects;
}
