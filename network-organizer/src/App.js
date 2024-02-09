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

function App() {
  return (
  <React.StrictMode>
    <Neo4jProvider >
    <Container maxWidth="md">
      <PeopleCollection />
      <OrganizationCollection />
      <br/>
    </Container>
    </Neo4jProvider>
  </React.StrictMode>
  );
}


//Generic

function NodeChip(props){
  return <Chip label={props.node.labels.join(" ") + " " + Object.keys(props.node.properties).map((p)=>(p + ":" + props.node.properties[p])).join(" ")} />
}

function LinkChip(props){
  return <Chip label={props.link.type} />
}


function QueryComponent(props){
    const [results, setResults] = React.useState([])
    // const [lastRequest, setLastRequest] = React.useState(undefined)

    const query = props.query 
    const resultState = props.cypherFunction(query)

    let refresh = () => {
        resultState.run(props.params || {}).
          then((result) => {
            console.log(result)
            setResults(result.records)
            props.onRefresh && props.onRefresh()
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
  } else if(type == "Organization"){
    return <>{props.node.properties.name}</>
  } else return <>{JSON.stringify(props.node.properties)}</>
}

function CollectionComponent(props){
    const [selectedResult, setSelectedResult] = React.useState(undefined)

    return <Card>
              <CardHeader title={props.title} />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    {props.results.map((r) => {
                      let p = r.get('m')
                      return <div style={{ cursor: "pointer" }} onClick={() => setSelectedResult(p)} key={p.identity.low}>
                        <NodeTextItem node={p} type={props.type} />
                      </div>
                    })}
                  </Grid>
                  <Grid item xs={6}>
                    {selectedResult && <NodeCard node={selectedResult} />}
                  </Grid>
                </Grid>
              </CardContent>
              <CardActions>
                <AddNode type={props.type} onAdd={props.refresh} />
              </CardActions>
            </Card>
}

function NodeCard(props) {
  return <QueryComponent query={`MATCH (m:Person)-[link]->(other) WHERE ID(m) = $id 
                                 RETURN link, other`}
                         params={{ id: props.node.identity.low }}
    cypherFunction={useReadCypher} >
    {(results, refresh) =>
      <QueryComponent query={`MATCH (m:Person)<-[link]-(other) WHERE ID(m) = $id 
                                    RETURN link, other`}
                      params={{ id: props.node.identity.low }}
        cypherFunction={useReadCypher} >
        {(results2, refresh2) =>
          <Card>
            <CardHeader title={<NodeChip node={props.node} />} />
            <CardContent>
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


//Specific

function PeopleCollection() {

  return <QueryComponent query={`MATCH (m:Person) RETURN m`}
                         cypherFunction={useReadCypher}
                         >
            {(results, refresh) => <CollectionComponent results={results} 
                                                        refresh={refresh} 
                                                        title="People"
                                                        type="Person"
                                                        />}
  </QueryComponent>
}

function OrganizationCollection() {

  return <QueryComponent query={`MATCH (m:Organization) RETURN m`}
                         cypherFunction={useReadCypher} >
            {(results, refresh) => <CollectionComponent results={results} 
                                                        refresh={refresh} 
                                                        title="Organizations" 
                                                        type="Organization" 
                                                        />}
  </QueryComponent>
}

let properties = {
  Person: {
    first: "string",
    last: "string"
  },
  Organization: {
    name: "string"
  }
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

function FieldsForType(props){
  let fields = properties[props.type]
  return <div>
    {Object.keys(fields).map((f) => {
      return <TextField key={f} label={f} onChange={(e) => {
        let newParams = {...props.params}
        newParams[f] = e.target.value
        props.setParams(newParams)
      }} />
    })}
  </div>
}

export default App;
