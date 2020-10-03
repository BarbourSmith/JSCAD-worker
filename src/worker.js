const jscad = require('@jscad/modeling');
const jsonSerializer= require('@jscad/json-serializer');
const jsonDeSerializer = require('@jscad/json-deserializer')
const stlSerializer = require('@jscad/stl-serializer')


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
const { hull } = hulls
const { union, subtract, intersect} = booleans
const { colorize } = require('@jscad/modeling').colors
const { extrudeLinear, extrudeRectangular, extrudeRotate } = require('@jscad/modeling').extrusions


function circ(values){
	var myCircle = circle({ radius: values[0]/2, segments: values[1]})
	var serializedCircle = jsonSerializer.serialize({}, myCircle)
	return {geometry: serializedCircle, tags: []}
}

function rect(values){
	var myCube = rectangle({size: values})
	var serializedCube = jsonSerializer.serialize({}, myCube)
	return {geometry: serializedCube, tags: []}
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
	let geometry = values[0][0].geometry
	var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, geometry)
	const extrudedObj = extrudeLinear({height: values[1]}, deserializedGeometry)
	var serializedResult = jsonSerializer.serialize({}, extrudedObj)
	return {geometry: serializedResult, tags: []}
}

function rotat(values){
    let geometry = values[0][0].geometry
	var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, geometry)
	const rotatedObj = rotate([3.1415*values[1]/180,3.1415*values[2]/180,3.1415*values[3]/180], deserializedGeometry)
	var serializedResult = jsonSerializer.serialize({}, rotatedObj)
	return {geometry: serializedResult, tags: []}
}

function trans(values){
	let geometry = values[0][0].geometry
	var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, geometry)
	const translatedObj = translate([values[1],values[2],values[3]], deserializedGeometry)
	var serializedResult = jsonSerializer.serialize({}, translatedObj)
	return {geometry: serializedResult, tags: []}
}

function diff(values){
	var deserializedGeometry0 = jsonDeSerializer.deserialize({output: 'geometry'}, values[0][0].geometry)
	var deserializedGeometry1 = jsonDeSerializer.deserialize({output: 'geometry'}, values[1][0].geometry)
	const subtractedObj = subtract(deserializedGeometry0, deserializedGeometry1)
	var serializedResult = jsonSerializer.serialize({}, subtractedObj)
	return {geometry: serializedResult, tags: []}
}

function intersection(values){
	var deserializedGeometry0 = jsonDeSerializer.deserialize({output: 'geometry'}, values[0][0].geometry)
	var deserializedGeometry1 = jsonDeSerializer.deserialize({output: 'geometry'}, values[1][0].geometry)
	const intersectionObj = intersect(deserializedGeometry0, deserializedGeometry1)
	var serializedResult = jsonSerializer.serialize({}, intersectionObj)
	return {geometry: serializedResult, tags: []}
}

function wrap(values){
	var deserializedGeometry = values.map(x => jsonDeSerializer.deserialize({output: 'geometry'}, x.geometry))
    
    const hullObj = hull(deserializedGeometry)
    
	var serializedResult = jsonSerializer.serialize({}, hullObj)
	return {geometry: serializedResult, tags: []}
}

function assembly(values){
	var deserializedGeometry = values[0].map(x => jsonDeSerializer.deserialize({output: 'geometry'}, x))
    
    const unionObj = union(deserializedGeometry)
    
	var serializedResult = jsonSerializer.serialize({}, unionObj)
	return serializedResult
}

function code(values){
    
    inputs = {};
    for (key in values[1]) {
      if (values[1][key] != null && typeof values[1][key] === 'object') {
        inputs[key] = jsonDeSerializer.deserialize({output: 'geometry'}, values[1][key])
      } else {
        inputs[key] = values[1][key];
      }
    }
    
    //These actions are available in the context that the code is executed in
    
    inputs["translate"] = translate
    inputs["sphere"] = sphere
    inputs["rotate"] = rotate
    inputs["scale"] = scale
    inputs["union"] = union
    inputs["subtract"] = subtract
    inputs["intersect"] = intersect
    
    //Evaluate the code in the created context
    const signature =
      '{ ' +
      Object.keys(inputs).join(', ') +
      ' }';
    const foo = new Function(signature, values[0]);
    const returnedGeometry = foo({...inputs });
    
    var serializedResult = jsonSerializer.serialize({}, returnedGeometry)
	return serializedResult
}

//Just a placeholder for now
function specify(values){
    return values[0]
}

//Just a placeholder for now
function tag(values){
    return values[0]
}
//Just a placeholder for now
function clr(values){
    return values[0]
}

function stl(values){
    
    var deserializedGeometry = jsonDeSerializer.deserialize({output: 'geometry'}, values[0].geometry)
    
    const rawData = stlSerializer.serialize({binary: false},deserializedGeometry)
    
    return rawData
}


// create a worker and register public functions
workerpool.worker({
    assemble: assembly,
 	circle: circ,
 	code: code,
    difference: diff,
    intersection:intersection,
    hull:wrap,
    specify: specify,
    stl:stl,
    tag, tag,
    color: clr,
 	translate: trans,
 	rectangle: rect,
 	extrude: extr,
 	polygon: poly,
 	rotate: rotat
});