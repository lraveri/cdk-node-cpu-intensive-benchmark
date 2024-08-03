import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CdkNodeCpuIntensiveStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, 'MyVpc', {
            maxAzs: 2,
            natGateways: 0
        });

        const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
            vpc,
            description: 'Allow ssh and http access',
            allowAllOutbound: true
        });

        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'allow ssh access from the world');
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'allow http access from the world');

        const role = new iam.Role(this, 'InstanceRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
        });

        role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

        const userData = ec2.UserData.forLinux();
        userData.addCommands(
            'yum update -y',
            'yum install -y docker',
            'service docker start',
            'usermod -a -G docker ec2-user',
            'yum install -y git',
            'sleep 10',
            'git clone https://github.com/lraveri/node-cpu-intensive.git /home/ec2-user/myapp',
            'cd /home/ec2-user/myapp',
            'docker build -t myapp .',
            'docker run -d -p 80:3000 --name myapp-container -e SERVER_PATH=src/01-single-thread/server.js myapp'
        );

        const instance = new ec2.Instance(this, 'MyInstance', {
            vpc,
            instanceType: new ec2.InstanceType('m5.xlarge'),
            machineImage: ec2.MachineImage.latestAmazonLinux(),
            securityGroup: securityGroup,
            role: role,
            userData: userData,
            vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC},
            associatePublicIpAddress: true
        });

        new cdk.CfnOutput(this, 'InstancePublicIp', {
            value: instance.instancePublicIp,
            description: 'The public IP of the instance',
        });
    }
}
