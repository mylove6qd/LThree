/**
 * @author lcx / https://github.com/mylove6qd
 */

import { Geometry } from '../src/core/Geometry.js';
import { BufferGeometry } from '../src/core/BufferGeometry.js';
import { Float32BufferAttribute } from '../src/core/BufferAttribute.js';
import { Vector3 } from '../src/math/Vector3.js';

//LineGeometry

class LineGeometry extends Geometry{
  
    //basePoints 基础点数组 [Vector2] / [Vector3]  width 条带宽度   相机点 cameraLookAt
    constructor(basePoints,width,cameraLookAt){
        basePoints = processBasePoints(basePoints);

        super();

        this.type = 'LineGeometry';

        this.parameters = {
            basePoints:basePoints,
            width:width,
            cameraLookAt:cameraLookAt
        }

        this.fromBufferGeometry( new LineBufferGeometry( basePoints,width,cameraLookAt ) );

		this.mergeVertices();
    }

}

//LineBufferGeometry

class LineBufferGeometry extends BufferGeometry{
  
    constructor(basePoints,width,cameraLookAt){
        basePoints = processBasePoints(basePoints);

        super();

        this.type = 'LineBufferGeometry';

        this.parameters = {
            basePoints:basePoints,
            width:width,
            cameraLookAt:cameraLookAt
        }

        buildPlane(this);

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

function buildPlane(obj){

    // buffers

    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];
    const basePoints = [];
    const cameraLookAt = [];

    //半径
    let width = obj.parameters.width/2;

    let point_3 = obj.parameters.cameraLookAt;

    //保存相机点位置
    cameraLookAt.push(point_3.x);
    cameraLookAt.push(point_3.y);
    cameraLookAt.push(point_3.z);

    //计算点
    for(let i = 0;i<obj.parameters.basePoints.length;i++){
        //基准点
        let point = obj.parameters.basePoints[i];

        //两个方向的法向量
        let targer_vector_1;
        let targer_vector_2;

        //如果是第一个点 他的法向量就是自己和后一个以及相机位置构成的平面的法向量
        if(i==0){
            let point_1 = obj.parameters.basePoints[0];
            let point_2 = obj.parameters.basePoints[1];
            //得到俩个方向的向量
            let vector_1 =  point_1.clone().add(point_3.clone().negate());
            let vector_2 =  point_2.clone().add(point_3.clone().negate());
            //得到整个线扩张的两个法向量
            targer_vector_1 = (vector_2.clone().cross(vector_1)).normalize();
            targer_vector_2 = targer_vector_1.clone().negate();
        }else if(i==obj.parameters.basePoints.length-1){
            //组后一个点就是最后和倒数第二个点
            let point_1 = obj.parameters.basePoints[i-1];
            let point_2 = obj.parameters.basePoints[i];
            //得到俩个方向的向量
            let vector_1 =  point_1.clone().add(point_3.clone().negate());
            let vector_2 =  point_2.clone().add(point_3.clone().negate());
            //得到整个线扩张的两个法向量
            targer_vector_1 = (vector_2.clone().cross(vector_1)).normalize();
            targer_vector_2 = targer_vector_1.clone().negate();
        }else {
            //其他点
            let point_1 = obj.parameters.basePoints[i-1];
            let point_2 = obj.parameters.basePoints[i+1];
            let point_center = obj.parameters.basePoints[i];

            let vector_1 =  point_1.clone().negate().add(point_center.clone());
            let vector_2 =  point_center.clone().negate().add(point_2.clone());

            let vector_tangent = vector_1.normalize().add(vector_2.normalize());

            //当前点到相机点的向量
            let vector_camera = point_center.clone().negate().add(point_3.clone()).negate();

            //得到整个线扩张的两个法向量
            targer_vector_1 = (vector_tangent.clone().cross(vector_camera)).normalize();
            targer_vector_2 = targer_vector_1.clone().negate();

        }

        //保存基准点
        basePoints.push(point.x);
        basePoints.push(point.y);
        basePoints.push(point.z);

        //保存正方向点
        let point_z = targer_vector_1.clone().multiplyScalar(width).add(point);
        vertices.push(point_z.x);
        vertices.push(point_z.y);
        vertices.push(point_z.z);

        //保存负方向点
        let point_f = targer_vector_2.clone().multiplyScalar(width).add(point)
        vertices.push(point_f.x);
        vertices.push(point_f.y);
        vertices.push(point_f.z);

        //保存点法向量
        normals.push(point_z.clone().add(point.clone().negate()).normalize().x);
        normals.push(point_f.clone().add(point.clone().negate()).normalize().y);

        //保存uv
        uvs.push(i/obj.parameters.basePoints.length-1);
        uvs.push(1);
        uvs.push(i/obj.parameters.basePoints.length-1);
        uvs.push(0);

    }

    //计算索引
    //面数
    let facesNumber = (obj.parameters.basePoints.length) - 1;
    for(let x = 0, i = 0;i<facesNumber;i++,x+=2){
        indices.push(x);
        indices.push(2*i+3);
        indices.push(2*i+2);

        indices.push(x);
        indices.push(2*i+1);
        indices.push(2*i+3);
    }

    // build geometry

    obj.setIndex( indices );
    obj.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
    obj.setAttribute( 'normal', new Float32BufferAttribute( normals, 3 ) );
    obj.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2 ) ); 
    obj.setAttribute( 'basePoints', new Float32BufferAttribute( basePoints, 3 ) );
    obj.setAttribute( 'cameraLookAt', new Float32BufferAttribute( cameraLookAt, 3 ) );

}

export { LineGeometry , LineBufferGeometry};