public class holdAndDelayOpptyController {
    
    @AuraEnabled
    public static String holdCommissionUpdate(Opportunity objOpportunity){
      try {
        String response = '';
        List<cm_Interim_Approvals__c> holdCommSplAppl = new List<cm_Interim_Approvals__c>();
        holdCommSplAppl = [Select id,Special_Approval_Type__c,cm_Decision__c 
		                      from cm_Interim_Approvals__c where cm_Opportunity__c =: objOpportunity.ID AND Special_Approval_Type__c =: ConstantsUtils.SPECIAL_APPROVAL_HOLD_DELAY_COMMISSION AND (cm_Decision__c != :ConstantsUtils.APPROVED AND cm_Decision__c != :ConstantsUtils.REJECTED and cm_Decision__c != 'Cancelled' and  cm_Decision__c != 'Recalled') ];
        
      if(!holdCommSplAppl.isEmpty()){
              response = System.Label.dontAllowUpdateHoldCommission;
          }else if(string.isBlank(objOpportunity.cm_Agency_Name__c)){
              response = System.Label.HoldCommissionAgencyNameErrorMsg;
          }else{
              if(objOpportunity.DelayAgencyCommission__c == ConstantsUtils.DELAY_AGENCY_COMMISSION_FULL){
                  objOpportunity.Delay_Agency_Commission_2nd_Half_Till__c = '';
              }
              updateOpportunityWithoutTrigger(new List<Opportunity>{objOpportunity});
              response = ConstantsUtils.RECORD_SAVED;
          }
          return response;
        } catch (Exception e) {
          throw new AuraHandledException(e.getMessage());
        }
    }

    public static void updateOpportunityWithoutTrigger(List<Opportunity> oppList){
      if(!oppList.isEmpty()) {
          RecursiveTriggerHandler.opportunityTrigger = false;
          Update oppList;
      }
    }   

}
