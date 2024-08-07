import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class CdkNodeCpuIntensiveStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {isDefault: true});

        const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
            vpc,
            description: 'Allow ssh and http access',
            allowAllOutbound: true
        });

        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'allow ssh access from the world');
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'allow http access from the world');

        const userData = ec2.UserData.forLinux();
        userData.addCommands(
            'yum update -y',
            'yum install -y docker',
            'service docker start',
            'usermod -a -G docker ec2-user',
            'yum install -y git',
            'git clone https://github.com/lraveri/node-cpu-intensive.git /home/ec2-user/myapp',
            'cd /home/ec2-user/myapp',
            'docker build -t myapp .',
            'docker run -d -p 80:3000 --name myapp-container -e SERVER_PATH=src/01-single-thread/server.js myapp'
        );

        const ami = ec2.MachineImage.latestAmazonLinux({
            generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
            cpuType: ec2.AmazonLinuxCpuType.X86_64,
        });

        const instance = new ec2.Instance(this, 'Instance', {
            vpc,
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T2,
                ec2.InstanceSize.MICRO
            ),
            machineImage: ami,
            securityGroup: securityGroup,
            userData: userData,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            associatePublicIpAddress: true
        });

        new cdk.CfnOutput(this, 'InstancePublicIp', {
            value: instance.instancePublicIp,
            description: 'The public IP of the instance',
        });
    }
}
