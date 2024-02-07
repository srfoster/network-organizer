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
      <People />
      <br/>
    </Container>
    </Neo4jProvider>
  </React.StrictMode>
  );
}

function People() {
    const [results, setResults] = React.useState([])
    const [lastRequest, setLastRequest] = React.useState(undefined)
    const [selectedPerson, setSelectedPerson] = React.useState(undefined)

    const query = `MATCH (m:Person) RETURN m`
    const params = {} //{ last: 'Foster' }
    const resultState = useReadCypher(query, params)

    React.useEffect(() => {
        console.log('Person effect')

        resultState.run().
          then((result) => {
            console.log(result)
            setResults(result.records)
          })
          .catch((error) => {
            console.error(error)
            setResults({error: resultState.error})
          })
    }, [lastRequest])


    let refresh = () => setLastRequest(new Date())

    return (
      <Card>
        <CardHeader title="People" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              {results.map((r) => {
                let p = r.get('m')
                return <div style={{cursor: "pointer"}} onClick={()=>setSelectedPerson(p)} key={p.identity.low}>
                  {p.properties.first} {p.properties.last}
                </div>
              })}
            </Grid>
            <Grid item xs={6}>
              {selectedPerson && <PersonCard person={selectedPerson} />}
            </Grid>
          </Grid>
        </CardContent>
        <CardActions>
          <AddPerson onAdd={refresh} />
        </CardActions>
      </Card>
    )
}

function PersonCard(props){
    const [results, setResults] = React.useState([])
    const [lastRequest, setLastRequest] = React.useState(undefined)
    const query = `MATCH (m:Person)-[link]->(other) WHERE ID(m) = $id RETURN link, other`
    const resultState = useReadCypher(query)

    React.useEffect(() => {
        const params = {id: props.person.identity.low} 

        resultState.run(params).
          then((result) => {
            console.log(result)
            setResults(result.records)
          })
          .catch((error) => {
            console.error(error)
            setResults({error: resultState.error})
          })
    }, [lastRequest, props.person])

  return <Card>
    <CardHeader title={ <NodeChip node={props.person} />} />
    <CardContent>
      <ul>{results.map((r) => {
        return <li key={r.get('other').identity.low}>
          <LinkChip link={r.get('link')} />
          <NodeChip node={r.get('other')} />
        </li>
      })}</ul>
    </CardContent>
  </Card>
}

function NodeChip(props){
  return <Chip label={props.node.labels.join(" ") + " " + Object.keys(props.node.properties).map((p)=>(p + ":" + props.node.properties[p])).join(" ")} />
}

function LinkChip(props){
  return <Chip label={props.link.type} />
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
