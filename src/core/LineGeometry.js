/**
 * @author lcx / https://github.com/mylove6qd
 */

import { Geometry } from 'three/src/core/Geometry.js';
import { BufferGeometry } from 'three/src/core/BufferGeometry.js';
import { Float32BufferAttribute } from 'three/src/core/BufferAttribute.js';
import { Vector3 } from 'three/src/math/Vector3.js';

//LineGeometry

class LineGeometry extends Geometry{
  
    //basePoints 基础点数组 [Vector2] / [Vector3]  width 条带宽度   相机点 cameraPosition
    constructor(basePoints,width,three){
       let cameraPosition = three.camera.position;
     //   let cameraNormals = new Vector3(0,0,-1).applyEuler(camera.rotation).normalize();

        basePoints = processBasePoints(basePoints);

        super();

        this.type = 'LineGeometry';

        this.parameters = {
            basePoints:basePoints,
            width:width,
            cameraPosition:cameraPosition
        }

        this.fromBufferGeometry( new LineBufferGeometry( basePoints,width,three ) );

		this.mergeVertices();
    }

}

//LineBufferGeometry

class LineBufferGeometry extends BufferGeometry{
  
    constructor(basePoints,width,three){

        let cameraPosition = three.camera.position;
      //  let cameraNormals = new Vector3(0,0,-1).applyEuler(camera.rotation).normalize();
        
        basePoints = processBasePoints(basePoints);

        super();

        this.type = 'LineBufferGeometry';

        this.parameters = {
            basePoints:basePoints,
            width:width,
            cameraPosition:cameraPosition
        }

        buildPlane(this);

    //计算索引
    //面数
    const indices = [];
    let facesNumber = (this.parameters.basePoints.length) - 1;
    for(let x = 0, i = 0;i<facesNumber;i++,x+=2){
        indices.push(x);
        indices.push(2*i+3);
        indices.push(2*i+2);
        indices.push(x);
        indices.push(2*i+1);
        indices.push(2*i+3);
    }

    // build geometry
    this.setIndex( indices );

   
    //保存uv
    const uvs = [];
    let p = this.parameters.basePoints.length;
    for(let i = 0;i<p;i++){
        uvs.push(i/(p-1));
        uvs.push(1);
        uvs.push(i/(p-1));
        uvs.push(0);
    }

    this.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2 ) ); 

    
    //绑定事件
    bindEvent(this,three)

    }
   

}

//处理基本点
function processBasePoints( points ) {

    let pot = [];

    for ( let i = 0, l = points.length; i < l; i ++ ) {

        const point = points[ i ];
        pot.push( new Vector3( point.x, point.y, point.z || 0 ) );

    }

    return pot;

}

// function buildPlaneForGPU(obj){
//        // buffers
//        const vertices = [];
//        const normals = [];
//        const basePoints = [];
//        const cameraNormals = [];

//        //点个数
//        let pointSize = obj.parameters.basePoints.length;
   
//        //半径
//        let width = obj.parameters.width/2;

//        const gpu = new GPU();

//        const calPoint = gpu.createKernel(function(){

//        }).setOutput();
// }

function buildPlane(obj){

    // buffers
    const vertices = [];
    const normals = [];
    const basePoints = [];
    const cameraNormals = [];

    //半径
    let width = obj.parameters.width/2;

    //计算点
    for(let i = 0;i<obj.parameters.basePoints.length;i++){
        //基准点
        let point = obj.parameters.basePoints[i];

        let point_1 ;
        let point_2 ;
        let point_center ;
        let cameraN;

        //如果是第一个点 他的法向量就是自己和后一个以及相机位置构成的平面的法向量
        if(i==0){
             point_1 = obj.parameters.basePoints[0];
             point_2 = obj.parameters.basePoints[2];
             point_center = point_1;
             cameraN = point_center.clone().negate().add(obj.parameters.cameraPosition);
        }else if(i==obj.parameters.basePoints.length-1){
             point_1 = obj.parameters.basePoints[i-1];
             point_2 = obj.parameters.basePoints[i];
             point_center = point_1;
             cameraN = point_center.clone().negate().add(obj.parameters.cameraPosition);
        }else {
            //其他点
             point_1 = obj.parameters.basePoints[i-1];
             point_2 = obj.parameters.basePoints[i+1];
             point_center = obj.parameters.basePoints[i];
             cameraN = point_center.clone().negate().add(obj.parameters.cameraPosition);
        }

        let compute = pointAlgorithm(point_1,point_center,point_2,cameraN,width);

        //保存点到相机的法向量
        cameraNormals.push(cameraN.x);
        cameraNormals.push(cameraN.y);
        cameraNormals.push(cameraN.z);
        cameraNormals.push(cameraN.x);
        cameraNormals.push(cameraN.y);
        cameraNormals.push(cameraN.z);

        //保存基准点
        basePoints.push(point.x);
        basePoints.push(point.y);
        basePoints.push(point.z);
        basePoints.push(point.x);
        basePoints.push(point.y);
        basePoints.push(point.z);

        //保存正方向点
        vertices.push(compute[0].x);
        vertices.push(compute[0].y);
        vertices.push(compute[0].z);

        //保存负方向点
        vertices.push(compute[1].x);
        vertices.push(compute[1].y);
        vertices.push(compute[1].z);

        //保存点法向量
        normals.push(cameraN.x);
        normals.push(cameraN.y);
        normals.push(cameraN.z);
        normals.push(cameraN.x);
        normals.push(cameraN.y);
        normals.push(cameraN.z);

    
    }

  
    obj.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
    obj.setAttribute( 'normal', new Float32BufferAttribute( normals, 3 ) );
    obj.setAttribute( 'basePoints', new Float32BufferAttribute( basePoints, 3 ) );
    obj.setAttribute( 'cameraNormals', new Float32BufferAttribute( cameraNormals, 3 ) );

}

//点位置和法向量算法 参数 前一个点 中间点 后面一个点 相机法向量 宽度
//返回值 上点 下点 法向量 
//three.js计算点
function pointAlgorithm(point_1,point_center,point_2,cameraN,width){
    let vector_1 =  point_1.clone().negate().add(point_center.clone());
    let vector_2 =  point_center.clone().negate().add(point_2.clone());

    let vector_tangent = vector_1.normalize().add(vector_2.normalize());

    //得到整个线扩张的两个法向量
    let targer_vector_2 = (vector_tangent.clone().cross(cameraN)).normalize();
    let targer_vector_1 = targer_vector_2.clone().negate();

    //正方向点
    let point_z = targer_vector_1.clone().multiplyScalar(width).add(point_center);

    //保存负方向点
    let point_f = targer_vector_2.clone().multiplyScalar(width).add(point_center)

    return [point_z,point_f];
}

//绑定事件
function bindEvent(obj,three){
    three.addRenderChangeEvent(obj.uuid,(time)=>{
        buildPlane(obj);
    },true);
}

export { LineGeometry , LineBufferGeometry };