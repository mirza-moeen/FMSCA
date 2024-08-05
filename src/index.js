import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import MUIDataTable from "mui-datatables";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import * as XLSX from "xlsx";
import './App.css'; // Ensure this import points to your CSS file

const muiCache = createCache({
  key: "mui-datatables",
  prepend: true
});

const CHUNK_SIZE = 50;

function App() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [processing, setProcessing] = useState(true); // Start with processing true

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching Excel file...');
        const response = await fetch('/data.xlsx');
        if (!response.ok) {
          throw new Error('Network response was not ok.');
        }
        const arrayBuffer = await response.arrayBuffer();
        console.log('Excel file fetched successfully.');

        // Parse the Excel file
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Extract headers
        const headers = rows[0] || [];
        const filteredHeaders = headers.map(header => ({
          name: header,
          label: header.replace(/_/g, ' ') // Optional: format headers for display
        }));

        // Initialize columns
        setColumns(filteredHeaders);

        // Function to process chunks
        const processChunks = () => {
          let start = 1; // Start after the header
          let end = CHUNK_SIZE;
          let allData = [];

          const processNextChunk = () => {
            if (start >= rows.length) {
              setData(allData);
              setProcessing(false);
              return;
            }

            const chunk = rows.slice(start, end);
            const chunkData = chunk.map(row =>
              headers.map(header => row[headers.indexOf(header)] || '')
            );

            allData = [...allData, ...chunkData];
            start = end;
            end = end + CHUNK_SIZE;

            // Batch update state
            setData(prevData => [...prevData, ...chunkData]);

            // Schedule the next chunk
            requestIdleCallback(processNextChunk);
          };

          processNextChunk();
        };

        processChunks();
        
      } catch (error) {
        console.error('Error fetching or processing the Excel file:', error);
        setProcessing(false); // Ensure processing is set to false on error
      }
    };

    fetchData();
  }, []);

  return (
    <CacheProvider value={muiCache}>
      <ThemeProvider theme={createTheme()}>
        {columns.length === 0 ? (
          <div className="loader" />
        ) : (
          <MUIDataTable
            title={"FMSCA Records"}
            data={data}
            columns={columns}
            options={{ 
              pagination: true, 
              rowsPerPage: 15 // Adjust as needed
            }}
          />
        )}
        {processing && <p>Loading more data...</p>} {/* Optional loading indicator */}
      </ThemeProvider>
    </CacheProvider>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
