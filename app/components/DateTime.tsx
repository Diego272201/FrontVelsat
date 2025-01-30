import React, { useState, useEffect } from "react";

export default function CalendarGenerator() {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return today;
  });
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    setStartDate(new Date().toISOString().split("T")[0]);
  }, []);

  const handleStartDateChange = (e:any) => {
    setStartDate(e.target.value);
    if (new Date(endDate) < new Date(e.target.value)) {
      setEndDate("");
    }
  };

  const handleEndDateChange = (e:any) => {
    setEndDate(e.target.value);
  };

  return (
    <div>
      <h1>Generate Calendar File</h1>
      <div className="generator">
        <section>
          <label htmlFor="startDate">Start Date</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
          />
        </section>
        <section>
          <label htmlFor="endDate">End Date</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            min={startDate}
          />
        </section>
        <section>
          <button id="create">Create file</button>
          <a
            className="download hide"
            id="downloadLink"
            download="event.ics"
            href="#"
          >
            ⇩ Download
          </a>
        </section>
      </div>
    </div>
  );
}
