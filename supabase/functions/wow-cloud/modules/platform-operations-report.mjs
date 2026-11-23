export function createOperationsReportAction({operationsReport}){
  return {'platform.operationsReport':({actor})=>operationsReport(actor)};
}
