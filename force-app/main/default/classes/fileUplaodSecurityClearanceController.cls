public with sharing class fileUplaodSecurityClearanceController {
    public class DocumentWrap{
      @AuraEnabled public string documentName;
      @AuraEnabled public string documentandLocName;
      @AuraEnabled public string description;
      @AuraEnabled public string docId;
      @AuraEnabled public string docStatus;
      @AuraEnabled public string priviewDOC;
      @AuraEnabled public Date createdDate;
      @AuraEnabled public string actualDOCName;
      @AuraEnabled public Boolean isPreview;
    }

    public class DataContainerWrap{
      @AuraEnabled
      public List<DocumentWrap> lstDocumentWrap;

      DataContainerWrap() {
        lstDocumentWrap = new List<DocumentWrap>();
      }
    }
    @AuraEnabled
    public static DataContainerWrap prepareDocumentData(String oppRec) {
      String baseURL = URL.getSalesforceBaseUrl().toExternalForm() ;
      DataContainerWrap data = new DataContainerWrap();
      Set<Id> accId = new Set<Id>();
      for(Opportunity opp: [select id, AccountId from Opportunity where id=:oppRec]) {
          accId.add(opp.AccountId);
          System.debug('accId '+ accId);
      }
      list<Security_Clearance_Docs__c> lstsecDocs = [select id,Actual_Document_Name__c,Document_Name__c,Account__c from Security_Clearance_Docs__c where Account__c IN:accId and Is_Active__c = true order by createdDate];
      system.debug('-->lstsecDocs '+ lstsecDocs);
      Set<id> setDOCIds = new Set<Id>();
      Map<string,ContentVersion> MapAttachment = new Map<string,ContentVersion>();
      Map<string,Security_Clearance_Docs__c> mapSRDOCS = new Map<string,Security_Clearance_Docs__c>();
      for(Security_Clearance_Docs__c objsecDOC:lstsecDocs){
          setDOCIds.add(objsecDOC.id);
          mapSRDOCS.put(objsecDOC.id,objsecDOC);
      }
      system.debug('-->mapSRDOCS '+ mapSRDOCS);
      system.debug('-->setDOCIds '+ setDOCIds);
      Map<string,string> MapkeyActualName = new Map<string,string>();
      for(ContentVersion objAttach:[select id,Title, FirstPublishLocationId, Description, CreatedDate,ContentDocumentId from ContentVersion where FirstPublishLocationId IN:setDOCIds]){
          if(mapSRDOCS.get(objAttach.FirstPublishLocationId)!=null)
              MapAttachment.put(mapSRDOCS.get(objAttach.FirstPublishLocationId).Document_Name__c,objAttach);
          MapkeyActualName.put(mapSRDOCS.get(objAttach.FirstPublishLocationId).Document_Name__c,mapSRDOCS.get(objAttach.FirstPublishLocationId).Actual_Document_Name__c);
      }
      system.debug('*********MapAttachment'+MapAttachment);
      system.debug('*********setDOCIds'+setDOCIds);
      List<Security_Clearance_Documents__c> SecurityDOcs = [select Security_Clearance_Doc_Name__c,Name,Id,Seq__c from Security_Clearance_Documents__c  where Is_Corporate__c = false order by Seq__c];
      for(Security_Clearance_Documents__c SecurityDOC:SecurityDOcs){
          DocumentWrap objwrap = new DocumentWrap();
          objwrap.documentName = SecurityDOC.Security_Clearance_Doc_Name__c;
          if(MapAttachment.get(SecurityDOC.Security_Clearance_Doc_Name__c)!=null){
              objwrap.actualDOCName = MapkeyActualName.get(SecurityDOC.Security_Clearance_Doc_Name__c);
              objwrap.documentandLocName = SecurityDOC.Security_Clearance_Doc_Name__c;
              objwrap.description =MapAttachment.get(SecurityDOC.Security_Clearance_Doc_Name__c).Description;
              objwrap.docStatus = 'Uploaded';
              objwrap.createdDate = Date.valueof(MapAttachment.get(SecurityDOC.Security_Clearance_Doc_Name__c).createdDate);
              objwrap.docId = MapAttachment.get(SecurityDOC.Security_Clearance_Doc_Name__c).ContentDocumentId;
              objwrap.priviewDOC = baseURL+'/servlet/servlet.FileDownload?file='+MapAttachment.get(SecurityDOC.Security_Clearance_Doc_Name__c).Id;
          }else{
              objwrap.docStatus = 'Pending Upload';
              objwrap.description = '';
              objwrap.documentandLocName = SecurityDOC.Security_Clearance_Doc_Name__c;
          }
          data.lstDocumentWrap.add(objwrap); 
      }
      return data;
    }

    @AuraEnabled
    public static String uploadFile(String base64, String filename, String recordId, String commentFile, String strDocName){
        String scDocId;
        if(String.isNotBlank(base64)) {
          Security_Clearance_Docs__c   objsDOC = new Security_Clearance_Docs__c();
          objsDOC.Account__c = recordId;
          objsDOC.Is_Active__c = true;
          objsDOC.Actual_Document_Name__c = filename;
          objsDOC.Document_Name__c = strDocName;
          objsDOC.description__c = commentFile;
          insert objsDOC;
          System.debug('----objsDOC----'+objsDOC);
          scDocId = objsDOC.ID;
        }
        
        ContentVersion cv = createContentVersion(base64, filename, scDocId, commentFile);
        ContentDocumentLink cdl = createContentLink(cv.Id, recordId);
        if (cv == null || cdl == null) { return null; }
        return cdl.Id;
  
    }

    private static ContentVersion createContentVersion(String base64, String filename, String scDocId, String commentFile) {
      ContentVersion cv = new ContentVersion();
      cv.VersionData = EncodingUtil.base64Decode(base64);
      cv.Title = filename;
      cv.PathOnClient = filename;
      cv.Description = commentFile;
      cv.FirstPublishLocationId = scDocId;
      try {
        insert cv;
        return cv;
      } catch(DMLException e) {
        System.debug(e);
        return null;
      }
    }

    private static ContentDocumentLink createContentLink(String contentVersionId, String recordId) {
      if (contentVersionId == null || recordId == null) { return null; }
      ContentDocumentLink cdl = new ContentDocumentLink();
      cdl.ContentDocumentId = [
      SELECT ContentDocumentId 
      FROM ContentVersion 
      WHERE Id =: contentVersionId
      ].ContentDocumentId;
      cdl.LinkedEntityId = recordId;
      // ShareType is either 'V', 'C', or 'I'
      // V = Viewer, C = Collaborator, I = Inferred
      cdl.ShareType = 'V';
      try {
      insert cdl;
      return cdl;
      } catch(DMLException e) {
      System.debug(e);
      return null;
      }
      }


}
