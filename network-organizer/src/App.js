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
import { Avatar, Chip, Grid, Stack, Divider, FormControl, InputLabel, Select, MenuItem, Typography, IconButton, Tab, Tabs, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import {plural} from 'pluralize'

const driver = createDriver('bolt', 'localhost', 7687, 'neo4j', 'Nimzovich101')

let properties = {
  Person: {
    first: "string",
    last: "string",
    image_url: "string"
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
  Team: {
    name: "string",
    short_name: "string"
  },
  JobTitle: {
    name: "string",
    short_name: "string"
  },
  Note: {
    content: "string",
  },
}

function linkTypes(){
  return ["WorksAt", "WorksFor", "BelongsTo", "Has", "FriendsWith", "RefersTo", "ReportsTo", "Xyz"] 
}

function nodeTypes(){
  return Object.keys(properties)
}

function App() {
  let [tab, setTab] = React.useState(0)

  let selectedNodeType = nodeTypes()[tab]

  return (
  <React.StrictMode>
    <Neo4jProvider >
    <Container maxWidth="md">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(e,v)=>{setTab(v)}} aria-label="basic tabs example">
          {nodeTypes().map((t, i) => {
            return <Tab key={t} label={t} />
          })}
        </Tabs>
      </Box>
      <CollectionCard title={plural(selectedNodeType)} type={selectedNodeType}/>
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
            <Button onClick={()=>{refresh();}}>Save</Button>
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
        variant={"outlined"}
        value={params && params[f] ? params[f] : ""}
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
      onDelete={!props.hideDelete && (()=>{})}
      variant="outlined"
      deleteIcon={!props.hideDelete && <DeleteLink link={props.link} onDelete={props.onDelete} />}
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

  return <Avatar sx={{fontSize: "inherit", width: 24, height: 24, bgcolor: stringToColor(node.labels[0])}}>{node.identity.low}</Avatar> 
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
  } else if(props.node.properties.content){
    return <>{props.node.properties.content.substring(0,20)+"..."}</>
  }
  else return <>{JSON.stringify(props.node.properties)}</>
}

function CollectionCard({title, type}) {
  const [selectedResult, setSelectedResult] = React.useState(undefined)

  return <QueryComponent query={`MATCH (m:${type}) RETURN m`
}
            params={{type: type}}
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
                  <NodeChip node={p} type={type} />
                </div>
              })}
            </Grid>
            <Grid item xs={6}>
              {selectedResult !== undefined && results[selectedResult] ? <NodeCard node={results[selectedResult].get('m')} onEdit={refresh} /> : ""}
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
              {node.properties.image_url && <img src={node.properties.image_url} style={{maxWidth: "100%"}} />}
              <Typography variant="h6">Properties</Typography>
              <EditNodeProperties node={node} onEdit={onEdit} />
              <Divider 
                variant="middle" 
                style={{margin: "10px 0"}} 
              />
              <Typography variant="h6">Links</Typography>
              <NodeLinks node={node} />
              <Divider 
                variant="middle" 
                style={{margin: "10px 0"}} 
              />
              <Typography variant="h6">Add Link</Typography>
              <AddLinkToNode node={node} onAdd={onEdit} />
            </CardContent>
          </Card>
}

function AddLinkToNode(props) {
  const [other, setOther] = React.useState(undefined)
  const [linkType, setLinkType] = React.useState(undefined)
  const [nodeType, setNodeType] = React.useState(undefined)

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
          <br/>
          <FormControl fullWidth>
            <InputLabel id="demo-simple-select-label">Link Type</InputLabel>
                <Select
                  value={linkType}
                  label="Link Type"
                  onChange={(e) => { setLinkType(e.target.value) }}
                >
                  {linkTypes().map((r) => {
                    return <MenuItem key={r}
                      value={r}
                    >{r}</MenuItem>
                  })}
                </Select>
          </FormControl>
          <br/>
          <br/>
          <FormControl fullWidth>
            <InputLabel>Node Type</InputLabel>
                <Select
                  value={nodeType}
                  label="Node Type"
                  onChange={(e) => { setNodeType(e.target.value); setOther(undefined) }}
                >
                  {nodeTypes().map((r) => {
                    return <MenuItem key={r}
                      value={r}
                    >{r}</MenuItem>
                  })}
                </Select>
          </FormControl>
          {nodeType && !other && <NodeSearchSelect
            type={nodeType}
            onSelect={(node) => {
              setOther(node)
            }} />}

         {other && linkType && 
         <><br/><br/><LinkChip 
                    to={other} 
                    link={{type: linkType, identity: {low: -1}}}
                    onDelete={()=>{}}
                    hideDelete={true}
                    /></>}
          {other && linkType && <Button onClick={() => {
            refresh();
          }}>Save</Button>}
        </>
      }
    </QueryComponent>
  )
}

function NodeSearchSelect(props){
 return <QueryComponent
      query={`MATCH (m:${props.type}) RETURN m`}
      params={{type: props.type}}
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
  return <QueryComponent query={`MATCH (m)-[link]->(other) WHERE ID(m) = $id 
                                 RETURN link, other`}
                         params={{ id: node.identity.low }}
                         refreshOnChange={node}
    cypherFunction={useReadCypher} >
    {(results, refresh) =>
      <QueryComponent query={`MATCH (m)<-[link]-(other) WHERE ID(m) = $id 
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
          query={`MATCH (m) WHERE ID(m) = ${props.node.identity.low} SET m = ${propertiesToCypherBindings(properties[props.node.labels[0]])} RETURN m`}
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
