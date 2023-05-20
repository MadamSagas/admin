import React, { useState,useEffect } from "react";
import {
  TextField,
  Card,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
} from "@material-ui/core";
import * as Yup from 'yup';
import { Formik } from 'formik';
import dayjs from 'dayjs';
import { SmartMUIDataTable } from '../../../components/SmartDataTable';
import bc from '../../../services/breathecode';
import BulkUpdateTag from './BulkUpdateTag';
import { useQuery } from '../../../hooks/useQuery';

const relativeTime = require('dayjs/plugin/relativeTime');

dayjs.extend(relativeTime);

const statusColors = {
  ERROR: 'text-white bg-error',
  PERSISTED: 'text-white bg-green',
  PENDING: 'text-white bg-secondary',
};

const tagTpes = [
  'STRONG',
  'SOFT',
  'DISCOVERY',
  'COHORT',
  'DOWNLOADABLE',
  'EVENT',
  'OTHER'
];

export const BulkTags = () => {
  const query = useQuery();
  const [items, setItems] = useState([]);
  const [bulkItems, setBulkItems] = useState([]);
  const [disputeIndex, setDisputeIndex] = useState(null);
  const [disputedReason, setDisputedReason] = useState('');

  Date.prototype.addDays = function (days) {
    const date = new Date(this.valueOf())
    date.setDate(date.getDate() + days)
    return date
  }

  const deleteTime = (disputed_at) => {

    const disputed = new Date(disputed_at);
    const tenDays = disputed.addDays(10);

    if ((tenDays - new Date()) / (1000 * 60 * 60 * 24) > 1) {
      const timeFromNow = dayjs(tenDays).fromNow(true);
      return `Will de deleted in ${timeFromNow}`;
    } else return 'Will be deleted today';
  }

  const ProfileSchema = Yup.object().shape({
    disputedReason: Yup.string().required('Please write the Disputed Reason'),
  });

  const columns = [

    {
      name: 'file name', // field name in the row object
      label: 'File Name', // column title that will be shown in table
      options: {
        filter: false,
        customBodyRenderLite: (dataIndex) => {
          const item = bulkItems[dataIndex];
         console.log(item,"item")
          
          return (
            <>
              <div className="text-center">
                <p className="mb-1">{item.name} </p>
              </div>
            </>
          );
        },
      },
    },
    {
      name: 'status', // field name in the row object
      label: 'Status', // column title that will be shown in table
      options: {
        filter: true,
        filterType: "dropdown",
        filterList: query.get('status') !== null ? [query.get('status')] : [],
        filterOptions: {
          names: ['APROVED', 'DISPUTED']
        },
        customBodyRender: (value, tableMeta) => {
          const item = bulkItems[tableMeta.rowIndex];
          return (
            <div className="flex items-center">
              <div className="ml-3">
              {/* className={`border-radius-4 px-2 pt-2px${statusColors[value]}`} */}
                  <small >
                    {item.status}
                  </small>
                
              </div>
            </div>
          );
        },
      },
    },
    
    {
      name: 'created_at',
      label: 'Created At',
      options: {
        filter: false,
        customBodyRenderLite: (i) => {
          const item =bulkItems[i];
          return (
            <div className="flex items-center">
              <div className="ml-3">
                <h5 className="my-0 text-15">
                  {item.created_at ? dayjs(item.created_at).format('MM-DD-YYYY') : '--'}
                </h5>
              </div>
            </div>
          );
        },
      },
    },
   
   
    
  ];

  const getTypes = () => {
    return new Promise((resolve, reject) => {
      setTimeout(()=>{
        resolve(tagTpes);
      }, 500);
    });
  }

  const loadData = async (querys) => {
    const { data } = await bc.marketing().getAcademyTags(querys);
    setItems(data.results || data);
    return data;
  };
  useEffect(() =>{
  const loadBulkData = async () => {
    const { data } = await bc.monitoring().get_bulk_upload();
   
    setBulkItems(data.results || data);
    return data;
  };
  loadBulkData();

},[])
  return (
    <Card container className="p-4">
      {/* <button onClick={()=>{
        loadBulkData()
      } 
      }>click</button> */}
        <SmartMUIDataTable
          title="All Students"
          columns={columns}
          items={bulkItems}
          options={{
            print: false,
            viewColumns: false,
            onFilterChipClose: async (index, removedFilter, filterList) => {
              setCohorts([]);
              
              const { data } = await bc.monitoring().get_bulk_upload();
   
    setBulkItems(data.results || data);
            },
          }}
          view="student?"
          historyReplace="/admissions/students"
          singlePage=""
          // options={{
          //   customToolbarSelect: (selectedRows, displayData, setSelectedRows) => (
          //     <AddBulkToCohort
          //       selectedRows={selectedRows}
          //       displayData={displayData}
          //       setSelectedRows={setSelectedRows}
          //       items={items}
          //     />
          //   ),
          // }}
          bulkActions={(props) => (
            <AddBulkToCohort
              items={items}
              {...props}
            />
          )}
          search={async (querys) => {
            const { data } = await bc.auth().getAcademyStudents(querys);
            setItems(data.results);
            return data;
          }}
          deleting={async (querys) => {
            const { status } = await bc.admissions().deleteStudentBulk(querys);
            return status;
          }}
        />
      <Dialog
        onClose={() => {
          setDisputeIndex(null);
          setDisputedReason('');
        }}
        // fullWidth
        // maxWidth="md"

        open={disputeIndex !== null}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <Formik
          initialValues={{
            disputedReason,
          }}
          enableReinitialize
          validationSchema={ProfileSchema}
          onSubmit={async (values) => {

            const tag = items[disputeIndex];

            const disputedAt = new Date();
            const data = {
              disputed_reason: disputedReason,
              disputed_at: disputedAt,
            };

            const result = await bc.marketing().updateAcademyTags(tag.slug, data);

            if (result.status >= 200 && result.status < 300) {
              const newItems = items;
              newItems[disputeIndex] = {
                ...newItems[disputeIndex],
                ...data
              };
              setItems(newItems);
            }
            setDisputeIndex(null);
            setDisputedReason('');
          }}
        >
          {({ errors, touched, handleSubmit }) => (
            <form
              onSubmit={handleSubmit}
              className="d-flex justify-content-center mt-0"
            >
              <DialogTitle id="simple-dialog-title">
                Write the dispute reason
                <div className="mt-4">
                  <TextField
                    error={errors.disputedReason && touched.disputedReason}
                    helperText={touched.disputedReason && errors.disputedReason}
                    name="disputedReason"
                    size="small"
                    variant="outlined"
                    value={disputedReason}
                    onChange={(e) => setDisputedReason(e.target.value)}
                    multiline
                    rows={4}
                    fullWidth
                  />
                </div>
              </DialogTitle>
              <DialogActions>
                <Button
                  onClick={() => {
                    setDisputeIndex(null);
                    setDisputedReason('');
                  }}
                  color="primary"
                >
                  Cancel
                </Button>
                <Button color="primary" type="submit" autoFocus >
                  Send now
                </Button>
              </DialogActions>
            </form>
          )}
        </Formik>
      </Dialog>
    </Card>
  );
};
