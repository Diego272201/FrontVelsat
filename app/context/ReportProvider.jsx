import React, { createContext, useState } from 'react'


  export const ReportContext = createContext(null);




export const ReportProvider = ({children})=> {
    
    const [name, setName] = useState("Diego");

    return <ReportContext.Provider value={[name, setName]}>{children}</ReportContext.Provider>;
};
