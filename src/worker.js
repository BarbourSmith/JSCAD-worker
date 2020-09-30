const jscad = require('@jscad/modeling');
const jsonSerializer= require('@jscad/json-serializer');
const jsonDeSerializer = require('@jscad/json-deserializer')


const workerpool = require('workerpool');

const {
  color,
  connectors,
  geometry,
  math,
  primitives,
  text,
  utils,

  booleans,
  expansions,
  extrusions,
  hulls,
  measurements,
  transforms
} = jscad

const { cuboid, sphere, cylinder, circle, star, rectangle } = require('@jscad/modeling').primitives
const { translate, rotate, scale } = transforms
const { colorize } = require('@jscad/modeling').colors
const { extrudeLinear, extrudeRectangular, extrudeRotate } = require('@jscad/modeling').extrusions


function circ(values){
	var myCircle = colorize([1, 0, 0, 0.75],circle({ radius: values[0]}))
	console.log(myCircle)
	var serializedCircle = jsonSerializer.serialize({}, myCircle)
	return serializedCircle
}

function rect(values){
	var myCube = rectangle({size: values})
	var serializedCube = jsonSerializer.serialize({}, myCube)
	return serializedCube
}

//not working
function poly(values){
	let roof = [[100,110], [0,110], [50,200]]
	let wall = [[0,0], [10,0], [10,10], [0,10]]

	let poly = polygon({ points: roof })
	var serializedPoly = jsonSerializer.serialize({}, poly)
	return serializedPoly
}

function extr(values){

	let geometry = values[0]
	//var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, jsonGeometry)
	const extrudedObj = extrudeLinear({height: values[1]}, geometry)
	//translate([10, 5, 0], [jscad.primitives.cylinder({ radius: 0.5, segments: 64 })])
	var serializedResult = jsonSerializer.serialize({}, extrudedObj)
	return serializedResult
}
function rotat(values){
	let geometry = values[0]
	var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, geometry)
	const rotatedObj = rotate([Math.PI / values[1],values[2],values[3]], deserializedGeometry)
	var serializedResult = jsonSerializer.serialize({}, rotatedObj)
	return serializedResult
}

function trans(values){
	
	let geometry = values[0]
	var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, geometry)
	const translatedObj = translate([values[1],values[2],values[3]], deserializedGeometry)
	//translate([10, 5, 0], [jscad.primitives.cylinder({ radius: 0.5, segments: 64 })])
	var serializedResult = jsonSerializer.serialize({}, translatedObj)
	return serializedResult	
}


// create a worker and register public functions
workerpool.worker({
 	circle: circ,
 	translate: trans,
 	rectangle: rect,
 	extrude: extr,
 	polygon: poly,
 	rotate: rotat
});