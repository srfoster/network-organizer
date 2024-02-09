import logo from './logo.svg';
import './App.css';
import { Neo4jProvider, createDriver, useReadCypher, useWriteCypher } from 'use-neo4j'
import React from "react"
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import CardHeader from '@mui/material/CardHeader';
import CardActions from '@mui/material/CardActions';
import { Chip, Grid } from '@mui/material';

const driver = createDriver('bolt', 'localhost', 7687, 'neo4j', 'Nimzovich101')

let properties = {
  Person: {
    first: "string",
    last: "string"
  },
  Organization: {
    name: "string"
  },
  Division: {
    name: "string",
    short_name: "string"
  },
  Department: {
    name: "string",
    short_name: "string"
  },
}

function App() {
  return (
  <React.StrictMode>
    <Neo4jProvider >
    <Container maxWidth="md">
      <CollectionCard title="People"        type="Person"/>
      <CollectionCard title="Organizations" type="Organization"/>
      <CollectionCard title="Divisions"     type="Division"/>
      <CollectionCard title="Departments"   type="Department"/>
      <br/>
    </Container>
    </Neo4jProvider>
  </React.StrictMode>
  );
}


function propertiesToCypherBindings(properties){
  return "{" + Object.keys(properties).map((k) => {
    return k + ": $" + k
  }).join(", ") + "}"
}

function AddNode(props) {
    const [params,  setParams ] = React.useState(undefined)

    return (
        <QueryComponent
          query={`MERGE (m:${props.type} ${propertiesToCypherBindings(properties[props.type])}) RETURN m`}
          params={params}
          cypherFunction={useWriteCypher}
          onRefresh={props.onAdd}
        >
          {(results, refresh) =>
          <>
            {<FieldsForType type={props.type} params={params} setParams={setParams} />}
            <Button onClick={()=>{refresh();}}>Submit</Button>
          </>
          }
        </QueryComponent>
    )
}

function FieldsForType({type, params, setParams}) {
  let fields = properties[type]
  return <div>
    {Object.keys(fields).map((f) => {
      return <TextField key={f} label={f}
        variant={"standard"}
        value={params && params[f]}
        onChange={(e) => {
          let newParams = { ...params }
          newParams[f] = e.target.value
          setParams(newParams)
        }} />
    })}
  </div>
}

function NodeChip(props){
  return <Chip label={props.node.labels.join(" ") + " " + Object.keys(props.node.properties).map((p)=>(p + ":" + props.node.properties[p])).join(" ")} />
}

function LinkChip(props){
  return <Chip label={props.link.type} />
}


function QueryComponent(props){
    const [results, setResults] = React.useState([])

    const query = props.query 
    const resultState = props.cypherFunction(query)

    let refresh = (callback) => {
        console.log("Running query", query, "with params", props.params || "none")
        resultState.run(props.params || {}).
          then((result) => {
            console.log(result)
            setResults(result.records)
            props.onRefresh && props.onRefresh()
            callback && callback()
          })
          .catch((error) => {
            console.error(error)
            setResults({error: resultState.error})
          })
    }

    React.useEffect(() => {
      if(props.cypherFunction == useReadCypher){
        refresh()
      }
    }, [JSON.stringify(props.params)])

    return (
      props.children(results, refresh)
    )
}

function NodeTextItem(props){
  let type = props.type

  if(type == "Person"){
    return <>{props.node.properties.first} {props.node.properties.last}</>
  } else if(props.node.properties.name){
    return <>{props.node.properties.name}</>
  } else return <>{JSON.stringify(props.node.properties)}</>
}

function CollectionCard({title, type}) {
  const [selectedResult, setSelectedResult] = React.useState(undefined)

  return <QueryComponent query={`MATCH (m:${type}) RETURN m`}
    cypherFunction={useReadCypher} >
    {(results, refresh) =>
      <Card>
        <CardHeader title={title} />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              {results.map((r, i) => {
                let p = r.get('m')
                return <div style={{ cursor: "pointer" }} onClick={() => setSelectedResult(i)} key={p.identity.low}>
                  <NodeTextItem node={p} type={type} />
                </div>
              })}
            </Grid>
            <Grid item xs={6}>
              {selectedResult !== undefined ? <NodeCard node={results[selectedResult].get('m')} onEdit={refresh} /> : ""}
            </Grid>
          </Grid>
        </CardContent>
        <CardActions>
          <AddNode type={type} onAdd={refresh} />
        </CardActions>
      </Card>}
  </QueryComponent>
}

function NodeCard({node, onEdit}) {
  console.log("NodeCard", node  )
  return <QueryComponent query={`MATCH (m:Person)-[link]->(other) WHERE ID(m) = $id 
                                 RETURN link, other`}
                         params={{ id: node.identity.low }}
    cypherFunction={useReadCypher} >
    {(results, refresh) =>
      <QueryComponent query={`MATCH (m:Person)<-[link]-(other) WHERE ID(m) = $id 
                                    RETURN link, other`}
                      params={{ id: node.identity.low }}
        cypherFunction={useReadCypher} >
        {(results2, refresh2) =>
          <Card>
            <CardHeader title={<NodeChip node={node} />} />
            <CardContent>
              <EditNodeProperties node={node} onEdit={()=>{onEdit()}} />
              <ul>{results.map((r) => {
                return <li key={r.get('other').identity.low}>
                  <LinkChip link={r.get('link')} />
                  <NodeChip node={r.get('other')} />
                </li>
              })}</ul>
              <ul>{results2.map((r) => {
                return <li key={r.get('other').identity.low}>
                  <NodeChip node={r.get('other')} />
                  <LinkChip link={r.get('link')} />
                </li>
              })}</ul>
            </CardContent>
          </Card>}
      </QueryComponent>}
  </QueryComponent>
}

function EditNodeProperties(props){
  let params = props.node.properties
  let [newParams, setNewParams] = React.useState(params)

  React.useEffect(() => {
    setNewParams(props.node.properties)
  }, [props.node.properties])

  return <>
    <QueryComponent
          query={`MATCH (m) WHERE ID(m) = ${props.node.identity.low} SET m = ${propertiesToCypherBindings(params)} RETURN m`}
          params={newParams}
          cypherFunction={useWriteCypher}
        >
      {(results, refresh) => <><FieldsForType
        type={props.node.labels[0]}
        params={newParams}
        setParams={setNewParams} />
        <Button onClick={()=>{refresh(props.onEdit)}}>Save</Button>
      </>
      }

    </QueryComponent>
  </>
}


export default App;
