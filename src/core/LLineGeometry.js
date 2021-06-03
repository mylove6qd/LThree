/**
 * @author lcx / https://github.com/mylove6qd
 */

import { Geometry } from 'three/src/core/Geometry.js';
import { BufferGeometry } from 'three/src/core/BufferGeometry.js';
import { Float32BufferAttribute } from 'three/src/core/BufferAttribute.js';
import { Vector3 } from 'three/src/math/Vector3.js';
import { GPU } from 'gpu.js';



//LLineGeometry

class LLineGeometry extends Geometry {

    //basePoints 基础点数组 [Vector2] / [Vector3]  width 条带宽度   相机点 cameraPosition
    constructor(basePoints, width, three) {
        let cameraPosition = three.camera.position;
        //   let cameraNormals = new Vector3(0,0,-1).applyEuler(camera.rotation).normalize();

        basePoints = processBasePoints(basePoints);

        super();

        this.type = 'LLineGeometry';

        this.parameters = {
            basePoints: basePoints,
            width: width,
            cameraPosition: cameraPosition
        }


        this.fromBufferGeometry(new LLineBufferGeometry(basePoints, width, three));

        this.mergeVertices();

    }

}

//LLineBufferGeometry

class LLineBufferGeometry extends BufferGeometry {

    constructor(basePoints, width, three) {

        let cameraPosition = three.camera.position;
        //  let cameraNormals = new Vector3(0,0,-1).applyEuler(camera.rotation).normalize();

        basePoints = processBasePoints(basePoints);

        super();

        this.type = 'LLineBufferGeometry';

        this.parameters = {
            basePoints: basePoints,
            width: width,
            cameraPosition: cameraPosition
        }


        buildPlane(this);
        //buildPlaneForGPU(this)
        //计算索引
        //面数
        const indices = [];
        let facesNumber = (this.parameters.basePoints.length) - 1;
        for (let x = 0, i = 0; i < facesNumber; i++, x += 2) {
            indices.push(x);
            indices.push(2 * i + 3);
            indices.push(2 * i + 2);
            indices.push(x);
            indices.push(2 * i + 1);
            indices.push(2 * i + 3);
        }

        // build geometry
        this.setIndex(indices);


        //保存uv
        const uvs = [];
        let p = this.parameters.basePoints.length;
        for (let i = 0; i < p; i++) {
            uvs.push(i / (p - 1));
            uvs.push(1);
            uvs.push(i / (p - 1));
            uvs.push(0);
        }

        this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));


        //绑定事件
        // bindEvent(this, three)

        this.updataMatrix = function (obj) {

            //变换的逆矩阵
            let matrix = obj.matrix.clone().getInverse(obj.matrix.clone());
          
            let a = []
            for (let i = 0; i < this.parameters.basePoints.length; i++) {
                a.push(this.parameters.basePoints[i].clone().applyMatrix4(obj.matrix));
            }
            buildPlane(this, a)
            let vertices = []

            for (let i = 0; i < this.attributes.position.array.length - 2; i += 3) {

                vertices.push(this.attributes.position.array[i] * matrix['elements'][0] + this.attributes.position.array[i + 1] * matrix['elements'][0 + 4] + this.attributes.position.array[i + 2] * matrix['elements'][0 + 4 + 4]);
                vertices.push(this.attributes.position.array[i] * matrix['elements'][0 + 1] + this.attributes.position.array[i + 1] * matrix['elements'][0 + 4 + 1] + this.attributes.position.array[i + 2] * matrix['elements'][0 + 4 + 4 + 1]);
                vertices.push(this.attributes.position.array[i] * matrix['elements'][0 + 1 + 1] + this.attributes.position.array[i + 1] * matrix['elements'][0 + 4 + 1 + 1] + this.attributes.position.array[i + 2] * matrix['elements'][0 + 4 + 4 + 1 + 1]);

            }

            this.setAttribute('position', new Float32BufferAttribute(vertices, 3));

        }

    }


}

//处理基本点
function processBasePoints(points) {

    let pot = [];

    for (let i = 0, l = points.length; i < l; i++) {

        const point = points[i];
        pot.push(new Vector3(point.x, point.y, point.z || 0));

    }

    return pot;

}

//GPU计算点
function buildPlaneForGPU(obj) {

    // buffers
    const vertices = [];
    const normals = [];

    //点
    let points = obj.parameters.basePoints;
    //点个数
    let pointSize = points.length;

    //半径
    let width = obj.parameters.width / 2;



    let pointPosition = [];
    const cameraPosition = [obj.parameters.cameraPosition.x, obj.parameters.cameraPosition.y, obj.parameters.cameraPosition.z];
    for (let i = 0; i < pointSize; i++) {
        pointPosition.push([points[i].x, points[i].y, points[i].z]);
        pointPosition.push([points[i].x, points[i].y, points[i].z]);
    }

    const out = calPoint(pointPosition, cameraPosition, width, pointPosition.length);
    // calPoint.destroy();
    // gpu.destroy();

    for (let i = 0; i < pointPosition.length; i++) {
        vertices.push(out[0][i][0]);
        vertices.push(out[0][i][1]);
        vertices.push(out[0][i][2]);

        normals.push(out[1][i][0]);
        normals.push(out[1][i][1]);
        normals.push(out[1][i][2]);
    }

    obj.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    obj.setAttribute('normal', new Float32BufferAttribute(normals, 3));
}

function buildPlane(obj, baspoint) {

    // buffers
    const vertices = [];
    const normals = [];

    //半径
    // let width = obj.parameters.width / 2;
    let points = [];

    if (baspoint == undefined) {
        points = obj.parameters.basePoints;
    } else {
        points = baspoint;
    }



    //计算点
    for (let i = 0; i < points.length; i++) {
        let scale = 2500 / obj.parameters.width
        let width =points[i].clone().distanceTo(obj.parameters.cameraPosition.clone())/scale

        let point_1;
        let point_2;
        let point_center;
        let cameraN;

        //如果是第一个点 他的法向量就是自己和后一个以及相机位置构成的平面的法向量
        if (i == 0) {
            point_1 = points[0];
            point_2 = points[2];
            point_center = point_1;
            cameraN = point_center.clone().negate().add(obj.parameters.cameraPosition);
        } else if (i == points.length - 1) {
            point_1 = points[i - 1];
            point_2 = points[i];
            point_center = point_1;
            cameraN = point_center.clone().negate().add(obj.parameters.cameraPosition);
        } else {
            //其他点
            point_1 = points[i - 1];
            point_2 = points[i + 1];
            point_center = points[i];
            cameraN = point_center.clone().negate().add(obj.parameters.cameraPosition);
        }

        let compute = pointAlgorithm(point_1, point_center, point_2, cameraN, width);

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

    obj.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    obj.setAttribute('normal', new Float32BufferAttribute(normals, 3));

}

//点位置和法向量算法 参数 前一个点 中间点 后面一个点 相机法向量 宽度
//返回值 上点 下点 法向量 
//three.js计算点
function pointAlgorithm(point_1, point_center, point_2, cameraN, width) {
    let vector_1 = point_1.clone().negate().add(point_center.clone());
    let vector_2 = point_center.clone().negate().add(point_2.clone());

    let vector_tangent = vector_1.normalize().add(vector_2.normalize());

    //得到整个线扩张的两个法向量
    let targer_vector_2 = (vector_tangent.clone().cross(cameraN)).normalize();
    let targer_vector_1 = targer_vector_2.clone().negate();

    //正方向点
    let point_z = targer_vector_1.clone().multiplyScalar(width).add(point_center);

    //保存负方向点
    let point_f = targer_vector_2.clone().multiplyScalar(width).add(point_center)

    return [point_z, point_f];
}

//绑定事件
function bindEvent(obj, three) {
    three.addRenderChangeEvent(obj.uuid, (time) => {
        buildPlane(obj);
        // buildPlaneForGPU(obj)
    }, true);
}

export { LLineBufferGeometry };

let gpu = new GPU();
let calPoint = gpu.createKernel(function (pointPosition, cameraPosition, width, size) {
    //计算方法
    //向量的反向
    function negate(array) {
        return [array[0] * -1, array[1] * -1, array[2] * -1];
    }
    //向量加法
    function add(array, array1) {
        return [array[0] + array1[0], array[1] + array1[1], array[2] + array1[2]];
    }
    //向量归一化
    function normalize(array) {
        let value = Math.sqrt(array[0] * array[0] + array[1] * array[1] + array[2] * array[2]);
        if (value == 0) {
            return array;
        }
        return [array[0] / value, array[1] / value, array[2] / value];
    }
    //向量的叉乘
    function cross(array, array1) {

        return [
            array[1] * array1[2] - array[2] * array1[1],
            array[2] * array1[0] - array[0] * array1[2],
            array[0] * array1[1] - array[1] * array1[0]
        ]

    }
    //向量点乘法 
    function multiplyScalar(array, width) {
        return [array[0] * width, array[1] * width, array[2] * width];
    }



    let widths = width;
    let cameraPosition1 = [cameraPosition[0], cameraPosition[1], cameraPosition[2]];
    let sum = [0, 0, 0];

    let point_1 = [0, 0, 0];
    let point_2 = [0, 0, 0];
    let point_center = [0, 0, 0];
    let cameraN = [0, 0, 0];

    if (this.thread.x > size) {
        return sum;
    } else {

        if (this.thread.x == 0 || this.thread.x == 1) {
            point_1 = [pointPosition[0][0], pointPosition[0][1], pointPosition[0][2]];
            point_2 = [pointPosition[3][0], pointPosition[3][1], pointPosition[3][2]];
            point_center = point_1;
            cameraN = add(negate(point_center), cameraPosition1);
        } else if (this.thread.x == size - 1 || this.thread.x == size - 2) {
            point_1 = [pointPosition[this.thread.x - 2][0], pointPosition[this.thread.x - 2][1], pointPosition[this.thread.x - 2][2]];
            point_2 = [pointPosition[this.thread.x][0], pointPosition[this.thread.x][1], pointPosition[this.thread.x][2]];
            point_center = point_1;
            cameraN = add(negate(point_center), cameraPosition1);
        } else {

            point_1 = [pointPosition[this.thread.x - 2][0], pointPosition[this.thread.x - 2][1], pointPosition[this.thread.x - 2][2]];
            point_2 = [pointPosition[this.thread.x + 2][0], pointPosition[this.thread.x + 2][1], pointPosition[this.thread.x + 2][2]];
            point_center = [pointPosition[this.thread.x][0], pointPosition[this.thread.x][1], pointPosition[this.thread.x][2]];
            cameraN = add(negate(point_center), cameraPosition1);

        }

        if (this.thread.y == 0) {

            let vector_1 = add(negate(point_1), point_center);
            let vector_2 = add(negate(point_center), point_2);

            let vector_tangent = add(normalize(vector_1), normalize(vector_2));

            let targer_vector_2 = normalize(cross(vector_tangent, cameraN));
            let targer_vector_1 = negate(targer_vector_2);

            //计算点
            if (this.thread.x % 2 == 0) {
                //上点
                sum = add(multiplyScalar(targer_vector_1, widths), point_center);
            } else {
                //下点
                sum = add(multiplyScalar(targer_vector_2, widths), point_center);
            }
        }
        if (this.thread.y == 1) {
            //计算法向量
            sum = cameraN;
        }

        return sum;
    }
}, {
    //constants: { size: pointPosition.length },
    output: [16384, 2]
});