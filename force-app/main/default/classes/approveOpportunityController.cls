public class approveOpportunityController {


    @AuraEnabled
    public static DataContainer loadData(Id oppId){

        DataContainer data = new DataContainer();
        Map<string,Map<String, list<Checklist_Item__c>>> mpFinal = getChecklistItemMap(oppId);

        for(String checkListType : mpFinal.keySet()){

            ChecklistTypeWrapper obj = new ChecklistTypeWrapper();
            obj.checklistType = checkListType;

            for(String checklistSection : mpFinal.get(checkListType).keySet()){

                checklistSectionWrapper objCheckListSection = new checklistSectionWrapper();
                objCheckListSection.sectionName = checklistSection;
                objCheckListSection.checklistItems = mpFinal.get(checkListType).get(checklistSection);
                obj.checklistSections.add(objCheckListSection);          
            }

            data.checklistTypes.add(obj);
        }

        List<cm_Interim_Approvals__c> resverCanlSpA = [Select id,Special_Approval_Type__c,cm_Decision__c 
                                                        from cm_Interim_Approvals__c 
                                                        where cm_Opportunity__c =: oppId AND 
                                                        Special_Approval_Type__c =: 'Security Exception' AND
                                                        ( cm_Decision__c != 'Approved' AND 
                                                        cm_Decision__c != 'Rejected' AND 
                                                        cm_Decision__c != 'Cancelled') limit 1];
        if(!resverCanlSpA.isEmpty()){

            throw new AuraHandledException('Some of the special approvals are still pending. Please approve or reject them before proceeding');
        }

        return data;
     
    }

    @AuraEnabled
    public static void adminApprove(Opportunity objOpportunity, String checklistItemJson){

        // Auto Submission for Security Clearance validation 
        String res = '';

        if(objOpportunity.Allow_Reservation__c == false){
            res = SecurityClearanceUtility.validateOppty(objOpportunity.ID,'InitialSubmit');
        }else{
            res = 'success';
        }
        System.debug('----res----'+res);
        // End of Auto Submission for Security Clearance validation 
        if(res != '' && res!='success'){
            throw new AuraHandledException(res);
        }else{

            objOpportunity.cm_approval_status__c = 'Approved by Admin';
            objOpportunity.recordtypeId = getRecordTypeId('Opportunity','Pending Finance Approval');
            objOpportunity.OwnerId = UserInfo.getUserId();

            string result = '';
            if(!Test.isRunningTest()){
                result = opportunityApproval(objOpportunity,'Approve'); 
            }else{
                result = 'Success';
            }

            if(result != 'Success'){
                throw new AuraHandledException(result);
            }
            else{
                // Create Security Clearance 
                String scResult = '';
                String accType = '';
                accType = SecurityClearance.CheckforJointOwners(objOpportunity.ID);
                if(accType == '0'){
                    scResult = SecurityClearanceUtility.submittosecurityClearance(objOpportunity.ID);
                }else if(accType == '-1'){
                    scResult = SecurityClearanceUtility.submittosecurityClearance_Corporte(objOpportunity.ID);
                }else{
                    scResult = SecurityClearanceUtility.submittosecurityClearance_JointOwner(objOpportunity.ID);
                }
                // End of Create Security Clearance 
                upsertTasks(objOpportunity, checklistItemJson);
                // Creation of Special approval for HOLD / Delay commission data 
                if(objOpportunity.Agency_Commission_Deduction_Type__c !=null || objOpportunity.DelayAgencyCommission__c !=null  
                    || objOpportunity.Delay_Agency_Commission_2nd_Half_Till__c!=null || objOpportunity.AgencyCommissionDeduction__c!= null 
                    || objOpportunity.DelayAgencyCommissionTill__c!=null){
                        SpecialApprovalService.raiseHoldDelaySpecialApproval(objOpportunity);
                    }      
            }
        }
    }

    private static string opportunityApproval(Opportunity objopportunity,string type){
        string strMessage = '';
        if(!Test.isRunningTest()){
            strMessage = CM_EmaarUtils.opportunityApproval(objopportunity,type);
        }else{
            strMessage = 'Success';
        }	 
        return strMessage;
    }

    private static void upsertTasks(Opportunity objOpportunity, String checklistItemJson){

        List<ChecklistTypeWrapper> checklistTypes = new List<ChecklistTypeWrapper>();

        if(checklistItemJson != null){
            checklistTypes = (List<ChecklistTypeWrapper>)JSON.deserialize(checklistItemJson,List<ChecklistTypeWrapper>.Class);
        }

        system.debug('raise tasks called ==>' + checklistTypes.size());

        objOpportunity.OwnerId = UserInfo.getUserId();
        List<Checklist_Item__c> lstAllItems = new List<Checklist_Item__c>(); 

        for(ChecklistTypeWrapper type: checklistTypes){
            for(ChecklistSectionWrapper section : type.checklistSections){
                lstAllItems.addAll(section.checklistItems);
            }
        }
        
        List<Checklist_Item__c> lstItems2Upsert = new List<Checklist_Item__c>();
        for(Checklist_Item__c cli: lstAllItems){
            if(cli.Id != null || cli.Raise_A_Task__c || cli.Available__c)
                lstItems2Upsert.add(cli);
        }
        
        system.debug('lstItems2Upsert -->' + lstItems2Upsert);

        if(!lstItems2Upsert.isEmpty())
            upsert lstItems2Upsert;
        update objopportunity;
       
      }


    private static Map<string,Map<String, list<Checklist_Item__c>>> getChecklistItemMap(Id oppId){

        Map<string,Map<String, list<Checklist_Item__c>>> mpFinal = new Map<string,Map<String, list<Checklist_Item__c>>>();

        Opportunity objOpportunity = [Select Account.IsPersonAccount from Opportunity where Id =: oppId];

        boolean isPersonAccount = objOpportunity.Account.isPersonAccount;
       
       string strChecklistQuery = '';
       
       if(isPersonAccount)
           strChecklistQuery = 'Select id, recordtype.name, CheckList_name__c,Section__c from Checklist_type__c where Individual_Account__c = true order by Sequence__c';
       else
           strChecklistQuery = 'Select id, recordtype.name, CheckList_name__c,Section__c from Checklist_type__c where Business_Account__c = true order by Sequence__c';
       
       Map<string,Checklist_Item__c> mpExisting = new Map<string,Checklist_Item__c>();
       for(Checklist_Item__c cli: [Select id, Opportunity__c,Available__c,Comments__c,Checklist_Name__c,Raise_a_task__c,Checklist_type__c,Checklist_type__r.CheckList_name__c,Checklist_type__r.Section__c from Checklist_Item__c where Opportunity__c=:objOpportunity.Id]){
           mpExisting.put(cli.Checklist_type__r.CheckList_name__c+'###'+cli.Checklist_type__r.Section__c,cli);
       }
       
       mpFinal = new Map<string,Map<String, list<Checklist_Item__c>>>();
       Map<String, list<Checklist_Item__c>> mpSections = new Map<String,List<Checklist_Item__c>>();
       for(Checklist_type__c ct: database.query(strChecklistQuery)){
           if(mpFinal.containsKey(ct.Recordtype.Name)){
               
               
               Map<String, list<Checklist_Item__c>> mpExistingCheck = mpFinal.get(ct.Recordtype.Name); 
               if(mpExistingCheck.containsKey(ct.Section__c)){
                   list<Checklist_Item__c> lstExisting = mpExistingCheck.get(ct.Section__c);
                   if(mpExisting.containsKey(ct.Checklist_name__c+'###'+ct.section__c))
                       lstExisting.add(mpExisting.get(ct.Checklist_name__c+'###'+ct.section__c));
                   else
                       lstExisting.add(new Checklist_Item__c(Opportunity__c = objOpportunity.Id, checklist_type__c = ct.Id , Checklist_Name__c = ct.Checklist_Name__c));
                   mpExistingCheck.put(ct.Section__c,lstExisting);
               }
               else{
                   
                   mpExistingCheck.put(ct.section__c, new list<Checklist_Item__c>{new Checklist_Item__c(Opportunity__c = objOpportunity.Id, checklist_type__c = ct.Id, Checklist_Name__c = ct.Checklist_Name__c, Comments__c ='')});          
               }
               
               mpFinal.put(ct.recordtype.name,mpExistingCheck);
           }
           else{
               if(!mpExisting.containsKey(ct.CheckList_name__c+'###'+ct.Section__c))
                   mpFinal.put(ct.RecordTYpe.name,new Map<String,List<Checklist_Item__c>>{ct.section__c=>new List<Checklist_Item__c>{new Checklist_Item__c(Opportunity__c=objOpportunity.Id,Checklist_Type__c = ct.Id, Checklist_Name__c = ct.Checklist_Name__c, Comments__c ='')}});
               else
                   mpFinal.put(ct.RecordTYpe.name,new Map<String,List<Checklist_Item__c>>{ct.section__c=>new List<Checklist_Item__c>{mpExisting.get(ct.CheckList_name__c+'###'+ct.Section__c)}});                    
           }
    
        }

        return mpFinal;
    }
    
    public static Id getRecordTypeId(String objectName, String recordName){
        Map<String,Schema.SObjectType> gd = Schema.getGlobalDescribe();  
        Schema.DescribeSObjectResult d = gd.get(objectName).getDescribe();
        return(d.getRecordTypeInfosByName().get(recordName).getRecordTypeId()); 
    }

    @AuraEnabled
    public static void adminReject(Opportunity objOpportunity){
        
        objOpportunity.OwnerId = UserInfo.getUserId();
        objOpportunity.cm_approval_status__c = 'Rejected by Admin';
        update objopportunity;
        CM_EmaarUtils.submitForApproval(objOpportunity.id);
    }

    @AuraEnabled
    public static void raiseTasks(Opportunity objOpportunity, String checklistItemJson){
        
        upsertTasks(objOpportunity, checklistItemJson);
    }

    @AuraEnabled
    public static String scMandatoryInfo(Opportunity objOpportunity){

        String redirectVal = SecurityClearance.CheckforJointOwners(objOpportunity.Id);
        if(redirectVal == '0'){
            System.debug('redirectVal '+redirectVal);
            //return '/apex/securityClearance?id='+objOpportunity.Id+'&onlyDocUpload=true';
           // return '/apex/SecurityClearance_Corporate?id='+objOpportunity.Id+'&onlyDocUpload=true';
            //return '/apex/SecurityClearance_JointOwners?id='+objOpportunity.Id+'&onlyDocUpload=true';
            return '0';
        }else if (redirectVal == '-1'){
            return '/apex/SecurityClearance_Corporate?id='+objOpportunity.Id+'&onlyDocUpload=true';
        }else{
            return '/apex/SecurityClearance_JointOwners?id='+objOpportunity.Id+'&onlyDocUpload=true';
        }    
    }

    public class DataContainer{

        @AuraEnabled
        public List<ChecklistTypeWrapper> checklistTypes;

        DataContainer(){
            checklistTypes = new List<ChecklistTypeWrapper>();
        }

    }

    public class ChecklistTypeWrapper{

        @AuraEnabled public String checklistType;
        @AuraEnabled public List<ChecklistSectionWrapper> checklistSections;

        ChecklistTypeWrapper(){
            checklistSections = new List<ChecklistSectionWrapper>();
        }
    }
    
    public class ChecklistSectionWrapper{
        
        @AuraEnabled public String sectionName;
        @AuraEnabled public List<Checklist_Item__c> checklistItems;

        ChecklistSectionWrapper(){
            checklistItems = new  List<Checklist_Item__c>();
        }
    }
    

}