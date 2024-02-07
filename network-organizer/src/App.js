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
    const [lastRequest, setLastRequest] = React.useState(undefined)

    const query = props.query 
    const resultState = props.cypherFunction(query)

    React.useEffect(() => {
        resultState.run(props.params || {}).
          then((result) => {
            console.log(result)
            setResults(result.records)
          })
          .catch((error) => {
            console.error(error)
            setResults({error: resultState.error})
          })
    }, [lastRequest, JSON.stringify(props.params)])

    let refresh = () => setLastRequest(new Date())

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
                <AddPerson onAdd={props.refresh} />
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


function AddPerson(props) {
    const [results, setResults] = React.useState([])
    const [last,  setLast ] = React.useState(undefined)
    const [first, setFirst] = React.useState(undefined)

    const query = `MERGE (m:Person {first: $first, last: $last}) RETURN m`
    const resultState = useWriteCypher(query)

    let submit = () => {
        const params = {first: first, last: last }

        resultState.run(params).
          then((result) => {
            console.log(result)
            setResults(result.records)
            props.onAdd(result.first)
          })
          .catch((error) => {
            console.error(error)
            setResults({error: resultState.error})
          })
    }


    return (
        <>
          <TextField id="outlined-basic" label="First" variant="outlined" 
            value={first} onChange={(e) => setFirst(e.target.value)} />
          <TextField id="outlined-basic" label="Last" variant="outlined" 
            value={last} onChange={(e) => setLast(e.target.value)} />
          <Button onClick={submit}>Submit</Button>
        </>
    )
}

export default App;
