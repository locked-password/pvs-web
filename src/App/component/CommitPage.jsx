import React, { useState, useEffect } from 'react'
import { makeStyles } from '@material-ui/core/styles'
import ProjectAvatar from './ProjectAvatar'
import DrawingBoard from './DrawingBoard'
import Axios from 'axios'
import moment from 'moment'
import { CircularProgress, Backdrop } from '@material-ui/core'
import { connect } from 'react-redux'
import { Redirect } from 'react-router-dom'

const useStyles = makeStyles((theme) => ({
    root: {
      display: 'flex',
      '& > *': {
        margin: theme.spacing(1),
      },
      minWidth: '30px',
    },
    backdrop: {
      zIndex: theme.zIndex.drawer + 1,
      color: '#fff',
    },
}))

function CommitPage(prop) {
	const classes = useStyles()
  const [commitListData, setCommitListData] = useState([])
  const [dataForTeamCommitChart, setDataForTeamCommitChart] = useState({ labels:[], data: { team: []} })
  const [dataForMemberCommitChart, setDataForMemberCommitChart] = useState({ labels:[], data: {} })
  const [currentProject, setCurrentProject] = useState({})

  const [open, setOpen] = useState(false);
  const handleClose = () => {
    setOpen(false);
  };
  const handleToggle = () => {
    setOpen(!open);
  };


  const projectId = localStorage.getItem("projectId")
  useEffect(() => {
    Axios.get(`http://localhost:9100/pvs-api/project/1/${projectId}`)
    .then((response) => {
      setCurrentProject(response.data)
    })
    .catch((error) => {
      console.error(error)
    })
  }, [])


  useEffect(() => {
    if(Object.keys(currentProject).length != 0) {
      handleToggle()
      const githubRepo = currentProject.repositoryDTOList.find(repo => repo.type == 'github')
      const query = githubRepo.url.split("github.com/")[1]
      Axios.post(`http://localhost:9100/pvs-api/commits/${query}`)
      .then((response) => {
        // todo need reafctor with async
        Axios.get(`http://localhost:9100/pvs-api/commits/${query}`)
          .then((response) => {
            setCommitListData(response.data)
            handleClose()
          })
          .catch((e) => {
            console.error(e)
          })
      })
      .catch((e) => {
        console.error(e)
      })
    }
  }, [currentProject, prop.startMonth, prop.endMonth])

  useEffect(() => {
    const { startMonth, endMonth } = prop

    let chartDataset = { labels:[], data: { team: []} }
    for (let month = moment(startMonth); month <= moment(endMonth); month=month.add(1, 'months')) {
      chartDataset.labels.push(month.format("YYYY-MM"))
      chartDataset.data.team.push(commitListData.filter(commit=>{
        return moment(commit.committedDate).format("YYYY-MM") == month.format("YYYY-MM")
      }).length)
    }
    
    setDataForTeamCommitChart(chartDataset)
  }, [commitListData, prop.startMonth, prop.endMonth])

  useEffect(() => {
    const { startMonth, endMonth } = prop

    let chartDataset = {
      labels:[],
      data: {}
    }
    new Set(commitListData.map(commit=>commit.authorName)).forEach(author => {
      chartDataset.data[author] = []
    })
    for (let month = moment(startMonth); month <= moment(endMonth); month=month.add(1, 'months')) {
      chartDataset.labels.push(month.format("YYYY-MM"))
      for (var key in chartDataset.data) {
        chartDataset.data[key].push(0)
      }
      commitListData.forEach(commitData => {
        if (moment(commitData.committedDate).format("YYYY-MM") == month.format("YYYY-MM")) {
          chartDataset.data[commitData.authorName][chartDataset.labels.length-1] += 1
        }
      })
    }
    let temp = Object.keys(chartDataset.data).map(key => [key, chartDataset.data[key]])
    temp.sort((first, second) => second[1].reduce((a, b)=>a+b)-first[1].reduce((a, b)=>a+b))
    let result = {}
    temp.slice(0, 10).forEach(x=> {
      result[x[0]] = x[1]
    })
    chartDataset.data = result
    setDataForMemberCommitChart(chartDataset)
  }, [commitListData, prop.startMonth, prop.endMonth])

  if(!projectId) {
    return (
      <Redirect to="/select"/>
    )
  }

  return(
    <div style={{marginLeft:"10px"}}>
      <Backdrop className={classes.backdrop} open={open}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <div className={classes.root}>
        <ProjectAvatar 
          size = "small" 
          project={currentProject}
        />
        <p>
          <h2>{currentProject ? currentProject.projectName : ""}</h2>
        </p>
      </div>
      <div className={classes.root}>
        <div style={{width: "67%"}}>
          <div>
            <h1>Team</h1>
            <div>
              <DrawingBoard data={dataForTeamCommitChart}/>
            </div>
            <h1>Member</h1>
            <div>
              <DrawingBoard data={dataForMemberCommitChart}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


const mapStateToProps = (state) => {
  return {
    startMonth: state.selectedMonth.startMonth,
    endMonth: state.selectedMonth.endMonth,
  }
}

export default connect(mapStateToProps)(CommitPage);