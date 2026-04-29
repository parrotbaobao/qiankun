const ALL_ERRORS = [
  { code: 'APIG.0101', service: 'API Gateway', httpStatus: 401, descZh: '接口未认证，访问该资源需要认证', descEn: 'API not authenticated. Authentication required to access this resource', solutionZh: '检查请求头中是否包含有效的 Token，或确认 AK/SK 签名正确', solutionEn: 'Check that a valid Token is included in the request header, or verify AK/SK signature' },
  { code: 'APIG.0201', service: 'API Gateway', httpStatus: 403, descZh: '没有访问该资源的权限', descEn: 'No permission to access this resource', solutionZh: '确认当前用户已被授予相应策略，联系管理员检查 IAM 权限', solutionEn: 'Confirm the current user has been granted the corresponding policy, contact admin to check IAM permissions' },
  { code: 'APIG.0301', service: 'API Gateway', httpStatus: 404, descZh: '请求的资源不存在', descEn: 'The requested resource does not exist', solutionZh: '确认资源 ID 或请求路径正确，资源是否已被删除', solutionEn: 'Verify that the resource ID or request path is correct and that the resource has not been deleted' },
  { code: 'APIG.0401', service: 'API Gateway', httpStatus: 429, descZh: 'API 请求频率超过限制', descEn: 'API request rate exceeds the limit', solutionZh: '降低请求频率，或联系服务提供商提升配额', solutionEn: 'Reduce request frequency or contact the service provider to increase quota' },
  { code: 'ECS.0000', service: 'ECS', httpStatus: 400, descZh: '请求参数错误', descEn: 'Invalid request parameters', solutionZh: '检查请求体中的参数格式是否符合文档要求', solutionEn: 'Check that the request body parameters conform to the documentation requirements' },
  { code: 'ECS.0001', service: 'ECS', httpStatus: 400, descZh: '规格名称无效', descEn: 'Invalid flavor name', solutionZh: '调用 ListFlavors 接口获取当前 Region 可用规格列表', solutionEn: 'Call ListFlavors API to get the list of available flavors in the current region' },
  { code: 'ECS.0005', service: 'ECS', httpStatus: 409, descZh: '云服务器状态不允许此操作', descEn: 'The ECS status does not allow this operation', solutionZh: '等待云服务器状态变为 ACTIVE 后重试，或先停止云服务器', solutionEn: 'Wait for ECS status to become ACTIVE and retry, or stop the ECS first' },
  { code: 'ECS.0010', service: 'ECS', httpStatus: 403, descZh: '实例配额不足', descEn: 'Insufficient instance quota', solutionZh: '在控制台申请扩大配额，或删除不使用的云服务器以释放配额', solutionEn: 'Apply to increase quota in the console, or delete unused ECS instances to release quota' },
  { code: 'OBS.0001', service: 'OBS', httpStatus: 403, descZh: '访问被拒绝，没有操作该资源的权限', descEn: 'Access denied. No permission to operate this resource', solutionZh: '检查桶策略和 IAM 策略是否正确配置，确认 AK/SK 对应账号有权限', solutionEn: 'Check bucket policy and IAM policy configuration, verify the AK/SK account has permissions' },
  { code: 'OBS.0002', service: 'OBS', httpStatus: 404, descZh: '请求的桶或对象不存在', descEn: 'The requested bucket or object does not exist', solutionZh: '确认桶名和对象键名拼写正确，对象未被删除', solutionEn: 'Verify bucket name and object key spelling is correct and object has not been deleted' },
  { code: 'OBS.0010', service: 'OBS', httpStatus: 409, descZh: '桶已存在', descEn: 'Bucket already exists', solutionZh: '使用不同的桶名，或先删除已存在的桶', solutionEn: 'Use a different bucket name, or delete the existing bucket first' },
  { code: 'VPC.0001', service: 'VPC', httpStatus: 400, descZh: 'VPC 名称已存在', descEn: 'VPC name already exists', solutionZh: '修改 VPC 名称后重试', solutionEn: 'Change the VPC name and retry' },
  { code: 'VPC.0002', service: 'VPC', httpStatus: 400, descZh: 'CIDR 格式无效', descEn: 'Invalid CIDR format', solutionZh: '确认 CIDR 格式为 x.x.x.x/x，且子网掩码范围在 8-30 之间', solutionEn: 'Verify CIDR format is x.x.x.x/x with subnet mask range between 8 and 30' },
  { code: 'VPC.0101', service: 'VPC', httpStatus: 404, descZh: '指定的 VPC 不存在', descEn: 'The specified VPC does not exist', solutionZh: '通过 ListVpcs 接口确认 VPC ID 是否正确', solutionEn: 'Confirm the VPC ID is correct using the ListVpcs API' },
  { code: 'IAM.0001', service: 'IAM', httpStatus: 400, descZh: '请求参数非法', descEn: 'Illegal request parameters', solutionZh: '参照 API 文档检查请求参数格式和必填字段', solutionEn: 'Refer to API documentation to check request parameter format and required fields' },
  { code: 'IAM.0002', service: 'IAM', httpStatus: 401, descZh: 'Token 已过期', descEn: 'Token has expired', solutionZh: '重新调用 GetToken 接口获取新 Token（有效期 24 小时）', solutionEn: 'Re-call the GetToken API to get a new Token (valid for 24 hours)' },
  { code: 'IAM.0006', service: 'IAM', httpStatus: 403, descZh: '用户没有操作该资源的权限', descEn: 'User has no permission to operate this resource', solutionZh: '确认已在 IAM 为用户或用户组授权对应服务的策略', solutionEn: 'Confirm IAM policies for the corresponding service have been granted to the user or group' },
  { code: 'RDS.0001', service: 'RDS', httpStatus: 400, descZh: '实例规格不支持', descEn: 'Instance flavor not supported', solutionZh: '调用 ListFlavors 查询支持的规格列表', solutionEn: 'Call ListFlavors to query the list of supported flavors' },
  { code: 'RDS.0010', service: 'RDS', httpStatus: 409, descZh: '实例正在执行其他操作', descEn: 'Instance is performing another operation', solutionZh: '等待当前操作完成后重试，可通过 ShowInstance 查询实例状态', solutionEn: 'Wait for the current operation to complete and retry. Use ShowInstance to query instance status' },
  { code: 'SFS.0001', service: 'SFS', httpStatus: 400, descZh: '文件系统名称已存在', descEn: 'File system name already exists', solutionZh: '更换文件系统名称后重新创建', solutionEn: 'Change the file system name and recreate' },
];

const SERVICES = [...new Set(ALL_ERRORS.map(e => e.service))];

exports.getServicesHandler = (req, res) => {
  res.json({ code: 0, data: SERVICES });
};

exports.getErrorsHandler = (req, res) => {
  const { service = '', keyword = '', page = 1, pageSize = 10 } = req.query;
  let list = ALL_ERRORS;

  if (service) list = list.filter(e => e.service === service);
  if (keyword) {
    const kw = keyword.toLowerCase();
    list = list.filter(e =>
      e.code.toLowerCase().includes(kw) ||
      e.descZh.includes(keyword) ||
      e.descEn.toLowerCase().includes(kw)
    );
  }

  const total = list.length;
  const start = (Number(page) - 1) * Number(pageSize);
  const pageData = list.slice(start, start + Number(pageSize));

  res.json({ code: 0, data: { total, list: pageData } });
};
