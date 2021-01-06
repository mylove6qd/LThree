/**
 * @author lcx / https://github.com/mylove6qd
 * THREE r-118
 */

import * as THREE from 'three';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';
import { LineMaterial } from 'three/examples/jsm/Lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/Lines/LineSegmentsGeometry.js';
import { LineSegments2 } from 'three/examples/jsm/Lines/LineSegments2.js';
import { LineGeometry } from 'three/examples/jsm/Lines/LineGeometry.js';
import { Line2 } from 'three/examples/jsm/Lines/Line2.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import LUtils from './LUtils';
import { LLineGeometry, LLineBufferGeometry } from './core/LLineGeometry.js';


import { Vector3, Vector4 } from 'three';
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
        //是否视角移动
        this._isControlsChange = false;
        //管理render事件的map
        this._renderEventMap = new Map();
        //管理renderChange事件的map
        this._renderChangeEventMap = new Map();
        //是否冒泡
        this._isPropagation = true;
        //按下的对象
        this._mousedownObj;
        //鼠标指向的对象
        this._mouseObj = null;
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
                        (obj[EventName])(obj);
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
        this.addRenderChangeEvent = function (eventName, fn, targer) {
            targer = targer == undefined ? true : targer;
            if (!this._renderEventMap.has(eventName)) {
                this._renderChangeEventMap.set(eventName, [fn, targer]);
            }
        }
        //删除redner事件
        this.removeRenderEvent = function (eventName) {
            if (this._renderEventMap.has(eventName)) {
                this._renderEventMap.delete(eventName);
                return;
            }
            if (this.addRenderChangeEvent.has(eventName)) {
                this.addRenderChangeEvent.delete(eventName);
                return;
            }
        };
        //阻止事件冒泡
        this.stopPropagation = function () {
            this._isPropagation = false
        }
        //渲染方法
        this.render = function (time) {
            if (this._isControlsChange) {
                for (let [key, value] of this._renderChangeEventMap) {
                    if (value[1]) {
                        value[0](time);
                    }
                }
            }

            for (let [key, value] of this._renderEventMap) {
                if (value[1]) {
                    value[0](time);
                }
            }

            this._isControlsChange = false;

            this.renderer.render(this.scene, this.camera);
        };
        //更新方法
        this.update = function (time) {
            requestAnimationFrame((time) => {
                this.update(time);
            });
            this.render(time);
            //tween动画
            TWEEN.update(time);
            //控制器
            //console.log(this.controls.update());

        };

        //直接看向某处
        this.lookAt = function (vec3) {
            this.camera.lookAt(vec3);
            this.controls.target.x = vec3.x;
            this.controls.target.y = vec3.y;
            this.controls.target.z = vec3.z;
        }
        //相机移动
        /*opt {
            easing:TWEEN.Easing.Elastic.InOut   //tween缓和的动画类型
            points:[Points,Points,Points.....]   //样条曲线Curve的getPoints  因该是Vector3对象   用来表示补间控制点
            time:1000      //时间  毫秒
            target:Vector3   //相机移动时候的视角中心点 
            fn:func   //回调
        }
        */
        this.animateCamera = function (opt) {
            let option = Object.assign({
                easing: TWEEN.Easing.Linear.None,
                points: this.camera.position,
                time: 1,
                target: new Vector3(this.controls.target.x, this.controls.target.y, this.controls.target.z),
                fn: function () { }
            }, opt);

            if (!(option.points instanceof Array)) {
                option.points = [option.points];
            }

            //变化的初始值
            let startData = {
                cx: this.camera.position.x,
                cy: this.camera.position.y,
                cz: this.camera.position.z,
                tx: this.controls.target.x,
                ty: this.controls.target.y,
                tz: this.controls.target.z
            }
            let tween = new TWEEN.Tween(startData);
            //关闭控制器
            this.controls.enabled = false;
            //相机位置补间数组 
            let cxs = [];
            let cys = [];
            let czs = [];
            for (let i = 0; i < option.points.length; i++) {
                cxs.push(option.points[i].x);
                cys.push(option.points[i].y);
                czs.push(option.points[i].z);
            }
            tween.to({
                cx: cxs,
                cy: cys,
                cz: czs,
                tx: option.target.x,
                ty: option.target.y,
                tz: option.target.z
            }, option.time);
            tween.onUpdate((data) => {
                this.camera.position.x = data.cx;
                this.camera.position.y = data.cy;
                this.camera.position.z = data.cz;
                this.controls.target.x = data.tx;
                this.controls.target.y = data.ty;
                this.controls.target.z = data.tz;
                this.controls.update();
            })
            tween.onComplete(() => {
                ///开启控制器
                this.controls.enabled = true;
                option.fn();
            });
            tween.easing(option.easing);
            tween.start();
        }

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
        this.camera.position.set(0, 1, 0);
        this.renderer = option.renderer;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.controls = controls;
        this.camera.lookAt(this.scene.position);
        this.controls.target.x = this.scene.position.x;
        this.controls.target.y = this.scene.position.y;
        this.controls.target.z = this.scene.position.z;
        //视角变化的才出发
        this.controls.addEventListener('change', () => {
            this._isControlsChange = true;
        });

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
            let obj = this._getRaycasterObj.bind(this)();
            if (this._mouseObj != null) {
                //判断是不是同一个对象
                if (this._mouseObj != obj) {
                    this._recursionEvent(obj, 'mouseenter', event);
                    this._recursionEvent(this._mouseObj, 'mouseleave', event);
                }
            } else {
                //新进入
                this._recursionEvent(obj, 'mouseenter', event);
            }
            this._mouseObj = obj;
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
export {
    LThree,
    THREE,
    LUtils,
    LLineGeometry,
    LLineBufferGeometry,
    OrbitControls,
    LineMaterial,
    LineSegmentsGeometry,
    LineSegments2,
    LineGeometry,
    Line2,
    CSS2DRenderer,
    CSS2DObject,
    TWEEN,
    GUI
};

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
