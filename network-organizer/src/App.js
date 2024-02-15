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
import { Avatar, Chip, Grid, Stack, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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
  return <Chip 
    avatar={<NodeAvatar node={props.node} />}
    label={<NodeTextItem node={props.node} />} />
}

function LinkChip(props){
  return <Stack direction="row">
    {props.from && <NodeChip node={props.from}/>} 
    <Divider orientation="vertical" variant="middle" flexItem />
    <Chip label={props.link.type} 
      onDelete={()=>{}}
      variant="outlined"
      deleteIcon={<DeleteLink link={props.link} onDelete={props.onDelete} />}
      />
    <Divider orientation="vertical" variant="middle" flexItem />
    {props.to && <NodeChip node={props.to} />}
  </Stack> 
}

function NodeAvatar({node}){
  function stringToColor(string) {
    let hash = 0;
    let i;
  
    /* eslint-disable no-bitwise */
    for (i = 0; i < string.length; i += 1) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
  
    let color = '#';
  
    for (i = 0; i < 3; i += 1) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    /* eslint-enable no-bitwise */
  
    return color;
  }

  return <Avatar sx={{width: 24, height: 24, bgcolor: stringToColor(node.labels[0])}}>{node.identity.low}</Avatar> 
}

function QueryComponent(props){
    const [results, setResults] = React.useState([])

    const query = props.query 
    const resultState = props.cypherFunction(query)

    let refresh = (callback) => {
        console.log("Running query", query, "with params", props.params || "none")
        resultState.run(props.params || {}).
          then((result) => {
            console.log("Query result", result)
            if(result && result.records){
              setResults(result.records.map((r) => {
                let oldGet = r.get 
                let time = new Date()
                r.get = (key) => {
                  let v = oldGet.bind(r)(key)
                  v.loadedAt = time
                  return v
                }
                return r
              }))
            }
            props.onRefresh && props.onRefresh()
            callback && callback()
          })
          .catch((error) => {
            console.error(error)
            setResults({error: resultState.error})
          })
    }

    React.useEffect(() => {
      if(props.cypherFunction == useReadCypher || props.dangerousWriteRefresh){
        refresh()
      }
    }, [JSON.stringify(props.params), (props.refreshOnChange && props.refreshOnChange.loadedAt)])

    return (
      props.children(results, refresh)
    )
}

function NodeTextItem(props){
  let type = props.type || props.node.labels[0]

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
  return <Card>
            <CardHeader title={<NodeChip node={node} />} />
            <CardContent>
              {/* node.loadedAt.toString() */}
              <EditNodeProperties node={node} onEdit={onEdit} />
              <NodeLinks node={node} />
              <AddLinkToNode node={node} onAdd={onEdit} />
            </CardContent>
          </Card>
}

function AddLinkToNode(props){
  const [other, setOther] = React.useState(undefined)
  const [linkType, setLinkType] = React.useState(undefined)

  return (
    <QueryComponent
      query={`MATCH (m) WHERE ID(m) = ${props.node.identity.low} 
             MATCH (n) WHERE ID(n) = ${other && other.identity.low}
             MERGE (m)-[link:${linkType}]->(n) RETURN link`}
      params={{}}
      cypherFunction={useWriteCypher}
      onRefresh={props.onAdd}
    >
      {(results, refresh) =>
      <>
        <TextField label="Link Type"
          variant={"standard"}
          value={linkType}
          onChange={(e) => {
            setLinkType(e.target.value)
          }} />
        <NodeSearchSelect 
          type="Organization"
          onSelect={(node) => { 
          setOther(node)
        }} />
        {<Button onClick={()=>{refresh();}}>Submit {other && other.identity.low + " " + other.loadedAt}</Button>}
      </>
      }
    </QueryComponent>
  )
}

function NodeSearchSelect(props){
 return <QueryComponent
      query={`MATCH (m:${props.type}) RETURN m`}
      params={{}}
      cypherFunction={useReadCypher}
    >
      {(results, refresh) =>
      <>
        <ul>
          {results.map((r) => {
            return <li key={r.get('m').identity.low} style={{ cursor: "pointer" }} onClick={() => props.onSelect(r.get('m'))}>
              <NodeChip node={r.get('m')} />
            </li>
          })}
        </ul>
      </>
      }
    </QueryComponent>
}

function NodeLinks({node}){
  return <QueryComponent query={`MATCH (m:Person)-[link]->(other) WHERE ID(m) = $id 
                                 RETURN link, other`}
                         params={{ id: node.identity.low }}
                         refreshOnChange={node}
    cypherFunction={useReadCypher} >
    {(results, refresh) =>
      <QueryComponent query={`MATCH (m:Person)<-[link]-(other) WHERE ID(m) = $id 
                                    RETURN link, other`}
                      params={{ id: node.identity.low }}
                      refreshOnChange={node}
        cypherFunction={useReadCypher} >
        {(results2, refresh2) =>
             <>
              {results.map((r) => {
                return <div key={r.get('other').identity.low}>
                  <LinkChip 
                    to={r.get('other')} 
                    link={r.get('link')} 
                    onDelete={()=>{refresh(refresh2)}}
                    />
                </div>
              })}
              {results2.map((r) => {
                return <div key={r.get('other').identity.low}>
                  <LinkChip 
                    from={r.get('other')}
                    link={r.get('link')} 
                    onDelete={()=>{refresh(refresh2)}}
                    />
                </div>
              })}
          </>}
      </QueryComponent>}
  </QueryComponent>
}

function DeleteLink(props){
  return <QueryComponent query={`MATCH ()-[doomed]->() WHERE ID(doomed) = $id DELETE doomed return doomed`}
      params={{ id: props.link.identity.low }}
      cypherFunction={useWriteCypher}
    >
      {(results, refresh) => {
        return <CloseIcon style={{cursor: "pointer"}} onClick={() => { refresh(props.onDelete); }} />
      }}
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
